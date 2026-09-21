package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/juanrodriguez/invitationisa/api/internal/store"
)

// invitationResponse es todo lo que la página pública necesita en una sola llamada.
type invitationResponse struct {
	Event     *store.Event          `json:"event"`
	Venues    []store.Venue         `json:"venues"`
	Itinerary []store.ItineraryItem `json:"itinerary"`
	Details   []store.PartyDetail   `json:"details"`
	Media     []store.Media         `json:"media"`
	Guest     guestView             `json:"guest"`
}

// guestView expone solo lo que el invitado debe ver de sí mismo: su nombre,
// sus pases y su respuesta. Nunca teléfono, notas internas ni otros invitados.
type guestView struct {
	Name   string      `json:"name"`
	Passes int         `json:"passes"`
	RSVP   *store.RSVP `json:"rsvp"`
}

func (s *Server) handleInvitation(w http.ResponseWriter, r *http.Request) {
	guest, err := s.store.GuestByToken(chi.URLParam(r, "token"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "invitación no encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	_ = s.store.MarkOpened(guest.ID)

	ev, err := s.store.CurrentEvent()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	venues, err := s.store.Venues(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	itinerary, err := s.store.Itinerary(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	details, err := s.store.Details(ev.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	media, err := s.store.Media(ev.ID, "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.fillMediaURLs(media)

	writeJSON(w, http.StatusOK, invitationResponse{
		Event:     ev,
		Venues:    venues,
		Itinerary: itinerary,
		Details:   details,
		Media:     media,
		Guest:     guestView{Name: guest.Name, Passes: guest.Passes, RSVP: guest.RSVP},
	})
}

type rsvpRequest struct {
	Status         string `json:"status"` // confirmed | declined
	AttendingCount int    `json:"attendingCount"`
	Message        string `json:"message"`
}

func (s *Server) handleRSVP(w http.ResponseWriter, r *http.Request) {
	guest, err := s.store.GuestByToken(chi.URLParam(r, "token"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "invitación no encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var req rsvpRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	rsvp, err := s.store.SaveRSVP(guest, req.Status, req.AttendingCount, strings.TrimSpace(req.Message))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rsvp)
}

type songRequest struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

func (s *Server) handleSongRequest(w http.ResponseWriter, r *http.Request) {
	guest, err := s.store.GuestByToken(chi.URLParam(r, "token"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "invitación no encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var req songRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "el título de la canción es obligatorio")
		return
	}
	err = s.store.AddSongRequest(guest.EventID, guest.ID, req.Title, strings.TrimSpace(req.Artist))
	if errors.Is(err, store.ErrDuplicateSong) {
		writeError(w, http.StatusConflict, "Esa canción ya la sugirió alguien más. ¡Gracias!")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}

// fillMediaURLs traduce la clave de almacenamiento a URL pública servible.
func (s *Server) fillMediaURLs(items []store.Media) {
	for i := range items {
		items[i].URL = s.files.URL(items[i].StorageKey)
	}
}
