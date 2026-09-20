package api

import (
	"context"
	"encoding/csv"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/juanrodriguez/invitationisa/backend/internal/auth"
	"github.com/juanrodriguez/invitationisa/backend/internal/storage"
	"github.com/juanrodriguez/invitationisa/backend/internal/store"
)

type ctxKey string

const ctxUser ctxKey = "admin_user"

// requireAdmin valida el JWT de la cookie. No hay consulta a la base: el
// token lleva su propia firma y su vencimiento.
func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(auth.CookieName)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "sesión requerida")
			return
		}
		claims, err := auth.ParseToken(s.jwtSecret, cookie.Value)
		if err != nil {
			// La cookie caducada se limpia para que el navegador no la siga
			// mandando en cada petición.
			s.clearSessionCookie(w)
			writeError(w, http.StatusUnauthorized, "sesión vencida, vuelve a entrar")
			return
		}

		// La firma y el vencimiento no bastan: un JWT sigue siendo válido
		// aunque el dueño haya cerrado sesión. Estas dos comprobaciones son
		// las que permiten anularlo antes de tiempo.
		if revoked, err := s.store.IsTokenRevoked(claims.ID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		} else if revoked {
			s.clearSessionCookie(w)
			writeError(w, http.StatusUnauthorized, "sesión cerrada, vuelve a entrar")
			return
		}

		validFrom, err := s.store.TokensValidFrom(claims.Email)
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !validFrom.IsZero() && claims.IssuedAt != nil &&
			claims.IssuedAt.Time.Before(validFrom) {
			s.clearSessionCookie(w)
			writeError(w, http.StatusUnauthorized, "sesión cerrada, vuelve a entrar")
			return
		}

		user := &store.AdminUser{Email: claims.Email}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxUser, user)))
	})
}

func (s *Server) setSessionCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   strings.HasPrefix(s.cfg.PublicURL, "https://"),
	})
}

func (s *Server) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   strings.HasPrefix(s.cfg.PublicURL, "https://"),
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	user, err := s.store.AdminByEmail(strings.ToLower(strings.TrimSpace(req.Email)))
	// Mismo mensaje para usuario inexistente y contraseña mala: no revelamos cuál falló.
	if err != nil || !auth.CheckPassword(user.PasswordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "credenciales inválidas")
		return
	}
	token, expires, err := auth.NewToken(s.jwtSecret, user.ID, user.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.setSessionCookie(w, token, expires)
	writeJSON(w, http.StatusOK, map[string]any{
		"email":     user.Email,
		"expiresAt": expires.UTC().Format(time.RFC3339),
	})
}

// handleLogout anula este token y borra la cookie. Anotarlo en la lista de
// revocados es lo que impide que siga sirviendo si alguien se quedó con una
// copia.
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(auth.CookieName); err == nil {
		if claims, err := auth.ParseToken(s.jwtSecret, cookie.Value); err == nil {
			expires := time.Now().Add(auth.SessionTTL)
			if claims.ExpiresAt != nil {
				expires = claims.ExpiresAt.Time
			}
			if err := s.store.RevokeToken(claims.ID, expires); err != nil {
				log.Printf("revocar token: %v", err)
			}
		}
	}
	s.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleLogoutAll invalida todos los tokens del usuario, estén donde estén.
func (s *Server) handleLogoutAll(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(ctxUser).(*store.AdminUser)
	if err := s.store.RevokeAllTokens(user.Email); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(ctxUser).(*store.AdminUser)
	writeJSON(w, http.StatusOK, map[string]any{"email": user.Email})
}

func (s *Server) handleSummary(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	sum, err := s.store.SummaryFor(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sum)
}

// --- Evento, lugares e itinerario ---

func (s *Server) handleGetEvent(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	venues, _ := s.store.Venues(ev.ID)
	itinerary, _ := s.store.Itinerary(ev.ID)
	details, _ := s.store.Details(ev.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"event": ev, "venues": venues, "itinerary": itinerary, "details": details,
	})
}

func (s *Server) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	var in store.Event
	if err := decode(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	in.ID = ev.ID
	if strings.TrimSpace(in.Slug) == "" {
		in.Slug = ev.Slug
	}
	if err := s.store.UpdateEvent(&in); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, in)
}

func (s *Server) handleReplaceVenues(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	var venues []store.Venue
	if err := decode(r, &venues); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if err := s.store.ReplaceVenues(ev.ID, venues); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out, _ := s.store.Venues(ev.ID)
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleReplaceItinerary(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	var items []store.ItineraryItem
	if err := decode(r, &items); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if err := s.store.ReplaceItinerary(ev.ID, items); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out, _ := s.store.Itinerary(ev.ID)
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleReplaceDetails(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	var items []store.PartyDetail
	if err := decode(r, &items); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if err := s.store.ReplaceDetails(ev.ID, items); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out, _ := s.store.Details(ev.ID)
	writeJSON(w, http.StatusOK, out)
}

// --- Invitados ---

// guestWithLink agrega el link listo para copiar y pegar en WhatsApp.
type guestWithLink struct {
	store.Guest
	Link string `json:"link"`
}

func (s *Server) withLinks(guests []store.Guest) []guestWithLink {
	base := strings.TrimRight(s.cfg.PublicURL, "/")
	out := make([]guestWithLink, 0, len(guests))
	for _, g := range guests {
		out = append(out, guestWithLink{Guest: g, Link: base + "/i/" + g.Token})
	}
	return out
}

func (s *Server) handleListGuests(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	guests, err := s.store.Guests(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s.withLinks(guests))
}

func (s *Server) handleCreateGuest(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	var g store.Guest
	if err := decode(r, &g); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	g.Name = strings.TrimSpace(g.Name)
	if g.Name == "" {
		writeError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}
	g.EventID = ev.ID
	g.Token = ""
	if err := s.store.CreateGuest(&g); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, s.withLinks([]store.Guest{g})[0])
}

func (s *Server) handleUpdateGuest(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var g store.Guest
	if err := decode(r, &g); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	g.ID, g.EventID = id, ev.ID
	if err := s.store.UpdateGuest(&g); errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "invitado no encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	updated, _ := s.store.GuestByID(id)
	writeJSON(w, http.StatusOK, s.withLinks([]store.Guest{*updated})[0])
}

func (s *Server) handleDeleteGuest(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.store.DeleteGuest(ev.ID, id); errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "invitado no encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleImportGuests carga la lista desde un CSV: nombre,pases,telefono,email,grupo
func (s *Server) handleImportGuests(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "falta el archivo CSV")
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	created := 0
	for i := 0; ; i++ {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			writeError(w, http.StatusBadRequest, "CSV inválido: "+err.Error())
			return
		}
		if len(rec) == 0 || strings.TrimSpace(rec[0]) == "" {
			continue
		}
		// Salta el encabezado si la primera celda parece un título de columna.
		if i == 0 && strings.EqualFold(strings.TrimSpace(rec[0]), "nombre") {
			continue
		}
		g := store.Guest{EventID: ev.ID, Name: strings.TrimSpace(rec[0]), Passes: 1}
		if len(rec) > 1 {
			if n, err := strconv.Atoi(strings.TrimSpace(rec[1])); err == nil {
				g.Passes = n
			}
		}
		if len(rec) > 2 {
			g.Phone = strings.TrimSpace(rec[2])
		}
		if len(rec) > 3 {
			g.Email = strings.TrimSpace(rec[3])
		}
		if len(rec) > 4 {
			g.GroupLabel = strings.TrimSpace(rec[4])
		}
		if err := s.store.CreateGuest(&g); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		created++
	}
	writeJSON(w, http.StatusOK, map[string]int{"created": created})
}

func (s *Server) handleListSongs(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	songs, err := s.store.SongRequests(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, songs)
}

// --- Exportaciones ---

// writeCSV manda el archivo con nombre de descarga y BOM de UTF-8. Sin el BOM,
// Excel en Windows abre los acentos como basura, que es justo lo que pasa con
// nombres en español.
func writeCSV(w http.ResponseWriter, filename string, rows [][]string) error {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	if _, err := w.Write([]byte{0xEF, 0xBB, 0xBF}); err != nil {
		return err
	}
	cw := csv.NewWriter(w)
	if err := cw.WriteAll(rows); err != nil {
		return err
	}
	cw.Flush()
	return cw.Error()
}

// handleExportGuests baja la lista en CSV. `status` filtra por respuesta:
// confirmed, declined, pending o vacío para todos.
func (s *Server) handleExportGuests(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	guests, err := s.store.Guests(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	status := r.URL.Query().Get("status")

	rows := [][]string{{
		"Invitado", "Grupo", "Pases", "Estado", "Asistentes",
		"Mensaje", "Respondió", "Teléfono", "Correo",
	}}
	total := 0
	for _, g := range guests {
		state := "pendiente"
		attending, message, respondedAt := "", "", ""
		if g.RSVP != nil {
			state = g.RSVP.Status
			attending = strconv.Itoa(g.RSVP.AttendingCount)
			message = g.RSVP.Message
			respondedAt = g.RSVP.RespondedAt
		}
		if status != "" && state != status {
			continue
		}
		if g.RSVP != nil && g.RSVP.Status == "confirmed" {
			total += g.RSVP.AttendingCount
		}
		rows = append(rows, []string{
			g.Name, g.GroupLabel, strconv.Itoa(g.Passes), state, attending,
			message, respondedAt, g.Phone, g.Email,
		})
	}
	// Una fila final con el total de asistentes ahorra tener que sumar a mano.
	rows = append(rows, []string{}, []string{"Total de asistentes confirmados", "", "", "", strconv.Itoa(total)})

	name := "invitados.csv"
	if status != "" {
		name = "invitados-" + status + ".csv"
	}
	if err := writeCSV(w, name, rows); err != nil {
		log.Printf("export invitados: %v", err)
	}
}

func (s *Server) handleExportSongs(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	songs, err := s.store.SongRequests(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	rows := [][]string{{"Canción", "Artista", "Sugerida por", "Fecha"}}
	for _, song := range songs {
		rows = append(rows, []string{song.Title, song.Artist, song.GuestName, song.CreatedAt})
	}
	if err := writeCSV(w, "canciones.csv", rows); err != nil {
		log.Printf("export canciones: %v", err)
	}
}

// --- Medios ---

func (s *Server) handleListMedia(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	items, err := s.store.Media(ev.ID, r.URL.Query().Get("section"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.fillMediaURLs(items)
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleUploadMedia(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes)
	// Solo 32 MB en memoria; el resto va a archivo temporal.
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "archivo demasiado grande")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "falta el archivo")
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	kind := storage.KindFor(contentType)
	if kind == "" {
		writeError(w, http.StatusUnsupportedMediaType, "solo se aceptan imagen, audio o video")
		return
	}
	section := r.FormValue("section")
	if section == "" {
		section = "gallery"
	}

	key := storage.NewKey(kind, section, header.Filename, contentType)
	if err := s.files.Put(r.Context(), key, file, contentType, header.Size); err != nil {
		writeError(w, http.StatusInternalServerError, "no se pudo guardar el archivo: "+err.Error())
		return
	}
	m := store.Media{
		EventID:    ev.ID,
		Kind:       kind,
		Section:    section,
		StorageKey: key,
		Mime:       contentType,
		SizeBytes:  header.Size,
		Caption:    r.FormValue("caption"),
	}
	if err := s.store.CreateMedia(&m); err != nil {
		// Si falla la BD borramos el archivo para no dejar huérfanos.
		_ = s.files.Delete(r.Context(), key)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	m.URL = s.files.URL(key)
	writeJSON(w, http.StatusCreated, m)
}

func (s *Server) handleUpdateMedia(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var body struct {
		Caption string `json:"caption"`
	}
	if err := decode(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if err := s.store.UpdateMediaCaption(ev.ID, id, body.Caption); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleReorderMedia(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	var body struct {
		IDs []int64 `json:"ids"`
	}
	if err := decode(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if err := s.store.ReorderMedia(ev.ID, body.IDs); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleDeleteMedia(w http.ResponseWriter, r *http.Request) {
	ev, ok := s.currentEvent(w)
	if !ok {
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	m, err := s.store.MediaByID(ev.ID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "medio no encontrado")
		return
	}
	if err := s.store.DeleteMedia(ev.ID, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	// El archivo se borra después del registro: si esto falla queda un huérfano,
	// que es menos grave que una fila apuntando a un archivo inexistente.
	_ = s.files.Delete(r.Context(), m.StorageKey)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
