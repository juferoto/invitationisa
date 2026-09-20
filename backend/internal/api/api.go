// Package api expone la API HTTP: rutas públicas para la invitación y rutas
// protegidas para el CRM.
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/juanrodriguez/invitationisa/backend/internal/config"
	"github.com/juanrodriguez/invitationisa/backend/internal/storage"
	"github.com/juanrodriguez/invitationisa/backend/internal/store"
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

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

	// Rutas públicas: todo se resuelve con el token del invitado.
	r.Route("/api/public", func(r chi.Router) {
		r.Get("/invitation/{token}", s.handleInvitation)
		r.Post("/invitation/{token}/rsvp", s.handleRSVP)
		r.Post("/invitation/{token}/songs", s.handleSongRequest)
	})

	// Rutas del CRM: exigen sesión de admin.
	r.Route("/api/admin", func(r chi.Router) {
		r.Post("/login", s.handleLogin)
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
		r.Handle("/media/*", http.StripPrefix("/media/", http.FileServer(http.Dir(local.Dir()))))
	}
	return r
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
