// Package api expone la API HTTP: rutas públicas para la invitación y rutas
// protegidas para el CRM.
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"github.com/juanrodriguez/invitationisa/api/internal/config"
	"github.com/juanrodriguez/invitationisa/api/internal/storage"
	"github.com/juanrodriguez/invitationisa/api/internal/store"
)

type Server struct {
	cfg       config.Config
	store     *store.Store
	files     storage.Store
	jwtSecret []byte
}

func New(cfg config.Config, st *store.Store, files storage.Store, jwtSecret []byte) *Server {
	return &Server{cfg: cfg, store: st, files: files, jwtSecret: jwtSecret}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(s.cors)
	// Techo general por IP. Abrir la invitación son unas quince peticiones, así
	// que 120 por minuto no estorba a nadie y corta el goteo automatizado.
	// `RealIP` va antes a propósito: detrás del proxy de Vercel todas las
	// peticiones llegarían con la misma dirección y el límite sería inútil.
	r.Use(httprate.LimitByIP(120, time.Minute))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

	// Rutas públicas: todo se resuelve con el token del invitado.
	r.Route("/api/public", func(r chi.Router) {
		r.Get("/invitation/{token}", s.handleInvitation)
		// Confirmar asistencia y sugerir canciones son actos puntuales: un
		// invitado normal no llega a diez por minuto, y el límite evita que
		// alguien llene la lista de canciones desde un script.
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/invitation/{token}/rsvp", s.handleRSVP)
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/invitation/{token}/songs", s.handleSongRequest)
	})

	// Rutas del CRM: exigen sesión de admin.
	r.Route("/api/admin", func(r chi.Router) {
		// La contraseña del panel es la única puerta al CRM: sin un freno,
		// probar claves a ciegas sale gratis. Diez intentos por minuto no
		// molestan a quien la escribe mal dos veces.
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/login", s.handleLogin)
		r.Group(func(r chi.Router) {
			r.Use(s.requireAdmin)
			r.Post("/logout", s.handleLogout)
			r.Post("/logout-all", s.handleLogoutAll)
			r.Get("/me", s.handleMe)
			r.Get("/summary", s.handleSummary)

			r.Get("/event", s.handleGetEvent)
			r.Put("/event", s.handleUpdateEvent)
			r.Put("/venues", s.handleReplaceVenues)
			r.Put("/itinerary", s.handleReplaceItinerary)
			r.Put("/details", s.handleReplaceDetails)

			r.Get("/guests", s.handleListGuests)
			r.Post("/guests", s.handleCreateGuest)
			r.Post("/guests/import", s.handleImportGuests)
			r.Get("/guests/export", s.handleExportGuests)
			r.Get("/guests/{id}/qr", s.handleGuestQR)
			r.Put("/guests/{id}", s.handleUpdateGuest)
			r.Delete("/guests/{id}", s.handleDeleteGuest)

			r.Get("/media", s.handleListMedia)
			r.Post("/media", s.handleUploadMedia)
			r.Put("/media/reorder", s.handleReorderMedia)
			r.Put("/media/{id}", s.handleUpdateMedia)
			r.Delete("/media/{id}", s.handleDeleteMedia)

			r.Get("/songs", s.handleListSongs)
			r.Get("/songs/export", s.handleExportSongs)
		})
	})

	// En modo local servimos los archivos desde el mismo binario.
	if local, ok := s.files.(*storage.Local); ok {
		files := http.StripPrefix("/media/", http.FileServer(http.Dir(local.Dir())))
		// Ver la invitación entera son pocas decenas de peticiones, pero el
		// video y el audio se piden por trozos y suman muchas más. El límite
		// es alto a propósito: frena la descarga en bucle sin cortarle la
		// reproducción a nadie. Contra un ataque repartido entre muchas
		// direcciones no basta: para eso los medios van a un CDN.
		r.With(httprate.LimitByIP(300, time.Minute)).Handle("/media/*", cacheForever(files))
	}
	return r
}

// cacheForever marca los medios como inmutables para el navegador.
//
// Cada archivo subido recibe un nombre propio irrepetible y nunca se
// sobrescribe: si el contenido cambia, cambia la URL. Eso permite decirle al
// navegador que no vuelva a pedirlo nunca. Sin esta cabecera, quien reabre la
// invitación se descarga el video entero otra vez, que es casi todo el tráfico
// que paga el servidor.
func cacheForever(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		next.ServeHTTP(w, r)
	})
}

// cors permite que el frontend de Next.js llame a la API en desarrollo.
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := s.cfg.CORSOrigin
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decode(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	return dec.Decode(v)
}

func pathID(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, key), 10, 64)
}

// currentEvent es el atajo del modo un-solo-evento: todas las rutas del CRM
// operan sobre el primer evento de la base.
func (s *Server) currentEvent(w http.ResponseWriter) (*store.Event, bool) {
	ev, err := s.store.CurrentEvent()
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no hay ningún evento configurado")
		return nil, false
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return nil, false
	}
	return ev, true
}
