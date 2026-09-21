package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// NewToken genera el identificador del link personalizado. 12 bytes aleatorios
// son suficientes para que no se pueda adivinar el link de otro invitado.
func NewToken() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

const guestColumns = `g.id, g.event_id, g.token, g.name, g.passes, g.phone, g.email,
	g.group_label, g.notes, g.opened_at, g.created_at,
	r.status, r.attending_count, r.message, r.responded_at`

func scanGuest(row interface{ Scan(...any) error }) (*Guest, error) {
	var g Guest
	var status, message, respondedAt sql.NullString
	var attending sql.NullInt64
	err := row.Scan(&g.ID, &g.EventID, &g.Token, &g.Name, &g.Passes, &g.Phone, &g.Email,
		&g.GroupLabel, &g.Notes, &g.OpenedAt, &g.CreatedAt,
		&status, &attending, &message, &respondedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if status.Valid {
		g.RSVP = &RSVP{
			GuestID:        g.ID,
			Status:         status.String,
			AttendingCount: int(attending.Int64),
			Message:        message.String,
			RespondedAt:    respondedAt.String,
		}
	}
	return &g, nil
}

func (s *Store) GuestByToken(token string) (*Guest, error) {
	return scanGuest(s.db.QueryRow(`SELECT `+guestColumns+`
		FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE g.token = ?`, token))
}

func (s *Store) GuestByID(id int64) (*Guest, error) {
	return scanGuest(s.db.QueryRow(`SELECT `+guestColumns+`
		FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE g.id = ?`, id))
}

func (s *Store) Guests(eventID int64) ([]Guest, error) {
	rows, err := s.db.Query(`SELECT `+guestColumns+`
		FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id
		WHERE g.event_id = ? ORDER BY g.name COLLATE NOCASE`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Guest{}
	for rows.Next() {
		g, err := scanGuest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *g)
	}
	return out, rows.Err()
}

func (s *Store) CreateGuest(g *Guest) error {
	if g.Token == "" {
		g.Token = NewToken()
	}
	if g.Passes < 1 {
		g.Passes = 1
	}
	res, err := s.db.Exec(`INSERT INTO guests (event_id, token, name, passes, phone, email, group_label, notes)
		VALUES (?,?,?,?,?,?,?,?)`, g.EventID, g.Token, g.Name, g.Passes, g.Phone, g.Email, g.GroupLabel, g.Notes)
	if err != nil {
		return err
	}
	if g.ID, err = res.LastInsertId(); err != nil {
		return err
	}
	return s.db.QueryRow(`SELECT created_at FROM guests WHERE id=?`, g.ID).Scan(&g.CreatedAt)
}

func (s *Store) UpdateGuest(g *Guest) error {
	res, err := s.db.Exec(`UPDATE guests SET name=?, passes=?, phone=?, email=?, group_label=?, notes=?
		WHERE id=? AND event_id=?`, g.Name, g.Passes, g.Phone, g.Email, g.GroupLabel, g.Notes, g.ID, g.EventID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeleteGuest(eventID, id int64) error {
	res, err := s.db.Exec(`DELETE FROM guests WHERE id=? AND event_id=?`, id, eventID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// MarkOpened registra la primera apertura del link. Sirve para saber a quién
// hay que insistirle por WhatsApp, no para medir a nadie.
func (s *Store) MarkOpened(guestID int64) error {
	_, err := s.db.Exec(`UPDATE guests SET opened_at = ? WHERE id = ? AND opened_at IS NULL`,
		time.Now().UTC().Format(time.RFC3339), guestID)
	return err
}

// SaveRSVP inserta o reemplaza la respuesta del invitado, recortando el número
// de asistentes al máximo de pases asignados.
func (s *Store) SaveRSVP(g *Guest, status string, attending int, message string) (*RSVP, error) {
	if status != "confirmed" && status != "declined" {
		return nil, errors.New("estado inválido")
	}
	if status == "declined" {
		attending = 0
	}
	if attending < 0 {
		attending = 0
	}
	if attending > g.Passes {
		attending = g.Passes
	}
	if status == "confirmed" && attending == 0 {
		attending = 1
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`INSERT INTO rsvps (guest_id, status, attending_count, message, responded_at)
		VALUES (?,?,?,?,?)
		ON CONFLICT(guest_id) DO UPDATE SET
			status=excluded.status, attending_count=excluded.attending_count,
			message=excluded.message, responded_at=excluded.responded_at`,
		g.ID, status, attending, message, now)
	if err != nil {
		return nil, err
	}
	return &RSVP{GuestID: g.ID, Status: status, AttendingCount: attending, Message: message, RespondedAt: now}, nil
}

func (s *Store) SummaryFor(eventID int64) (*Summary, error) {
	var sum Summary
	err := s.db.QueryRow(`SELECT
		COUNT(*),
		COALESCE(SUM(g.passes),0),
		COALESCE(SUM(CASE WHEN r.status='confirmed' THEN 1 ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN r.status='declined'  THEN 1 ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN r.status IS NULL     THEN 1 ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN r.status='confirmed' THEN r.attending_count ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN g.opened_at IS NOT NULL THEN 1 ELSE 0 END),0)
		FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE g.event_id = ?`, eventID).
		Scan(&sum.Guests, &sum.TotalPasses, &sum.Confirmed, &sum.Declined, &sum.Pending, &sum.AttendingSeat, &sum.Opened)
	if err != nil {
		return nil, err
	}
	return &sum, nil
}

// ErrDuplicateSong indica que esa canción ya estaba sugerida para el evento.
var ErrDuplicateSong = errors.New("la canción ya fue sugerida")

// foldAccents quita cualquier marca diacrítica descomponiendo el texto en
// Unicode y descartando los signos combinantes. Es preferible a una lista de
// sustituciones a mano, que solo cubría las tildes agudas del español y dejaba
// pasar "Biciclèta" o "Bíçíçleta" como canciones distintas.
func foldAccents(v string) string {
	decomposed := norm.NFD.String(v)
	var b strings.Builder
	b.Grow(len(decomposed))
	for _, r := range decomposed {
		if unicode.Is(unicode.Mn, r) { // Mn = marca combinante sin ancho
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

// normalizeSong arma la clave de comparación: sin mayúsculas, sin tildes, sin
// puntuación y con los espacios internos colapsados.
func normalizeSong(title, artist string) string {
	clean := func(v string) string {
		folded := foldAccents(strings.ToLower(v))
		// La puntuación sobra para comparar: "Corazon Partio!" y "Corazon
		// Partio" son la misma canción.
		var b strings.Builder
		for _, r := range folded {
			if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) {
				b.WriteRune(r)
			}
		}
		return strings.Join(strings.Fields(b.String()), " ")
	}
	return clean(title) + "|" + clean(artist)
}

// RenormalizeSongs recalcula la clave de todas las filas. Se ejecuta al
// arrancar para que, si cambia la función de normalización, los registros
// viejos se comparen con la misma regla que los nuevos.
func (s *Store) RenormalizeSongs() error {
	rows, err := s.db.Query(`SELECT id, title, artist FROM song_requests`)
	if err != nil {
		return err
	}
	type song struct {
		id            int64
		title, artist string
	}
	var all []song
	for rows.Next() {
		var sg song
		if err := rows.Scan(&sg.id, &sg.title, &sg.artist); err != nil {
			rows.Close()
			return err
		}
		all = append(all, sg)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	for _, sg := range all {
		key := normalizeSong(sg.title, sg.artist)
		// Si al recalcular dos filas colisionan, se queda la más antigua.
		var clash int64
		err := s.db.QueryRow(`SELECT id FROM song_requests
			WHERE normalized = ? AND id < ? LIMIT 1`, key, sg.id).Scan(&clash)
		if err == nil {
			if _, err := s.db.Exec(`DELETE FROM song_requests WHERE id = ?`, sg.id); err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if _, err := s.db.Exec(`UPDATE song_requests SET normalized = ? WHERE id = ?`, key, sg.id); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) AddSongRequest(eventID, guestID int64, title, artist string) error {
	normalized := normalizeSong(title, artist)

	// Comprobamos antes para poder dar un mensaje claro, y el índice único de
	// la tabla cubre el caso de dos envíos simultáneos.
	var exists int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM song_requests WHERE event_id=? AND normalized=?`,
		eventID, normalized).Scan(&exists); err != nil {
		return err
	}
	if exists > 0 {
		return ErrDuplicateSong
	}

	_, err := s.db.Exec(`INSERT INTO song_requests (event_id, guest_id, title, artist, normalized)
		VALUES (?,?,?,?,?)`, eventID, guestID, title, artist, normalized)
	if err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return ErrDuplicateSong
	}
	return err
}

func (s *Store) SongRequests(eventID int64) ([]SongRequest, error) {
	rows, err := s.db.Query(`SELECT sr.id, COALESCE(g.name,''), sr.title, sr.artist, sr.created_at
		FROM song_requests sr LEFT JOIN guests g ON g.id = sr.guest_id
		WHERE sr.event_id=? ORDER BY sr.created_at DESC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SongRequest{}
	for rows.Next() {
		var sr SongRequest
		if err := rows.Scan(&sr.ID, &sr.GuestName, &sr.Title, &sr.Artist, &sr.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, sr)
	}
	return out, rows.Err()
}
