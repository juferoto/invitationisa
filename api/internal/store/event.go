package store

import (
	"database/sql"
	"errors"
)

var ErrNotFound = errors.New("no encontrado")

const eventColumns = `id, slug, celebrant_name, title, intro_message, event_date, date_icon, rsvp_deadline,
	blessing, parents, godparents, dress_code, dress_code_style, dress_code_women, dress_code_men,
	reserved_colors, gift_message, hashtag, hashtag_label,
	share_title, share_message, share_upload_url, notes,
	closing_title, closing_message, closing_signoff, theme_primary, theme_accent`

func scanEvent(row interface{ Scan(...any) error }) (*Event, error) {
	var e Event
	err := row.Scan(&e.ID, &e.Slug, &e.CelebrantName, &e.Title, &e.IntroMessage, &e.EventDate,
		&e.DateIcon, &e.RSVPDeadline, &e.Blessing, &e.Parents, &e.Godparents, &e.DressCode, &e.DressCodeStyle,
		&e.DressCodeWomen, &e.DressCodeMen, &e.ReservedColors,
		&e.GiftMessage, &e.Hashtag, &e.HashtagLabel,
		&e.ShareTitle, &e.ShareMessage, &e.ShareUploadURL, &e.Notes,
		&e.ClosingTitle, &e.ClosingMessage, &e.ClosingSignoff, &e.ThemePrimary, &e.ThemeAccent)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

// CurrentEvent devuelve el evento activo. En modo un-solo-evento siempre es el primero.
func (s *Store) CurrentEvent() (*Event, error) {
	return scanEvent(s.db.QueryRow(`SELECT ` + eventColumns + ` FROM events ORDER BY id LIMIT 1`))
}

func (s *Store) CreateEvent(e *Event) error {
	res, err := s.db.Exec(`INSERT INTO events
		(slug, celebrant_name, title, intro_message, event_date, date_icon, rsvp_deadline, blessing, parents,
		 godparents, dress_code, dress_code_style, dress_code_women, dress_code_men,
		 reserved_colors, gift_message, hashtag, hashtag_label,
		 share_title, share_message, share_upload_url, notes,
		 closing_title, closing_message, closing_signoff, theme_primary, theme_accent)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		e.Slug, e.CelebrantName, e.Title, e.IntroMessage, e.EventDate, e.DateIcon, e.RSVPDeadline,
		e.Blessing, e.Parents,
		e.Godparents, e.DressCode, e.DressCodeStyle, e.DressCodeWomen, e.DressCodeMen,
		e.ReservedColors, e.GiftMessage, e.Hashtag, e.HashtagLabel,
		e.ShareTitle, e.ShareMessage, e.ShareUploadURL, e.Notes,
		e.ClosingTitle, e.ClosingMessage, e.ClosingSignoff,
		e.ThemePrimary, e.ThemeAccent)
	if err != nil {
		return err
	}
	e.ID, err = res.LastInsertId()
	return err
}

func (s *Store) UpdateEvent(e *Event) error {
	_, err := s.db.Exec(`UPDATE events SET
		slug=?, celebrant_name=?, title=?, intro_message=?, event_date=?, date_icon=?, rsvp_deadline=?,
		blessing=?, parents=?, godparents=?, dress_code=?, dress_code_style=?, dress_code_women=?,
		dress_code_men=?, reserved_colors=?, gift_message=?, hashtag=?, hashtag_label=?,
		share_title=?, share_message=?, share_upload_url=?, notes=?,
		closing_title=?, closing_message=?, closing_signoff=?,
		theme_primary=?, theme_accent=?, updated_at=datetime('now')
		WHERE id=?`,
		e.Slug, e.CelebrantName, e.Title, e.IntroMessage, e.EventDate, e.DateIcon, e.RSVPDeadline,
		e.Blessing, e.Parents,
		e.Godparents, e.DressCode, e.DressCodeStyle, e.DressCodeWomen, e.DressCodeMen,
		e.ReservedColors, e.GiftMessage, e.Hashtag, e.HashtagLabel,
		e.ShareTitle, e.ShareMessage, e.ShareUploadURL, e.Notes,
		e.ClosingTitle, e.ClosingMessage, e.ClosingSignoff,
		e.ThemePrimary, e.ThemeAccent, e.ID)
	return err
}

func (s *Store) Venues(eventID int64) ([]Venue, error) {
	rows, err := s.db.Query(`SELECT id, event_id, kind, name, address, city, starts_at, maps_url, sort_order
		FROM venues WHERE event_id=? ORDER BY sort_order, id`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Venue{}
	for rows.Next() {
		var v Venue
		if err := rows.Scan(&v.ID, &v.EventID, &v.Kind, &v.Name, &v.Address, &v.City, &v.StartsAt, &v.MapsURL, &v.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

// ReplaceVenues sustituye la lista completa: el panel edita todo el bloque a la vez.
func (s *Store) ReplaceVenues(eventID int64, venues []Venue) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM venues WHERE event_id=?`, eventID); err != nil {
		return err
	}
	for i, v := range venues {
		if _, err := tx.Exec(`INSERT INTO venues (event_id, kind, name, address, city, starts_at, maps_url, sort_order)
			VALUES (?,?,?,?,?,?,?,?)`, eventID, v.Kind, v.Name, v.Address, v.City, v.StartsAt, v.MapsURL, i); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) Itinerary(eventID int64) ([]ItineraryItem, error) {
	rows, err := s.db.Query(`SELECT id, event_id, time_label, title, icon, sort_order
		FROM itinerary_items WHERE event_id=? ORDER BY sort_order, id`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ItineraryItem{}
	for rows.Next() {
		var it ItineraryItem
		if err := rows.Scan(&it.ID, &it.EventID, &it.TimeLabel, &it.Title, &it.Icon, &it.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (s *Store) ReplaceItinerary(eventID int64, items []ItineraryItem) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM itinerary_items WHERE event_id=?`, eventID); err != nil {
		return err
	}
	for i, it := range items {
		if _, err := tx.Exec(`INSERT INTO itinerary_items (event_id, time_label, title, icon, sort_order)
			VALUES (?,?,?,?,?)`, eventID, it.TimeLabel, it.Title, it.Icon, i); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) Details(eventID int64) ([]PartyDetail, error) {
	rows, err := s.db.Query(`SELECT id, event_id, title, description, icon, sort_order
		FROM party_details WHERE event_id=? ORDER BY sort_order, id`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PartyDetail{}
	for rows.Next() {
		var d PartyDetail
		if err := rows.Scan(&d.ID, &d.EventID, &d.Title, &d.Description, &d.Icon, &d.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) ReplaceDetails(eventID int64, items []PartyDetail) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM party_details WHERE event_id=?`, eventID); err != nil {
		return err
	}
	for i, d := range items {
		if _, err := tx.Exec(`INSERT INTO party_details (event_id, title, description, icon, sort_order)
			VALUES (?,?,?,?,?)`, eventID, d.Title, d.Description, d.Icon, i); err != nil {
			return err
		}
	}
	return tx.Commit()
}
