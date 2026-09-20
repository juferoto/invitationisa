package store

func (s *Store) Media(eventID int64, section string) ([]Media, error) {
	query := `SELECT id, event_id, kind, section, storage_key, mime, size_bytes, caption, sort_order, created_at
		FROM media WHERE event_id=?`
	args := []any{eventID}
	if section != "" {
		query += ` AND section=?`
		args = append(args, section)
	}
	query += ` ORDER BY section, sort_order, id`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Media{}
	for rows.Next() {
		var m Media
		if err := rows.Scan(&m.ID, &m.EventID, &m.Kind, &m.Section, &m.StorageKey, &m.Mime,
			&m.SizeBytes, &m.Caption, &m.SortOrder, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) CreateMedia(m *Media) error {
	// El nuevo archivo va al final de su sección.
	var next int
	if err := s.db.QueryRow(`SELECT COALESCE(MAX(sort_order)+1, 0) FROM media WHERE event_id=? AND section=?`,
		m.EventID, m.Section).Scan(&next); err != nil {
		return err
	}
	m.SortOrder = next
	res, err := s.db.Exec(`INSERT INTO media (event_id, kind, section, storage_key, mime, size_bytes, caption, sort_order)
		VALUES (?,?,?,?,?,?,?,?)`, m.EventID, m.Kind, m.Section, m.StorageKey, m.Mime, m.SizeBytes, m.Caption, m.SortOrder)
	if err != nil {
		return err
	}
	if m.ID, err = res.LastInsertId(); err != nil {
		return err
	}
	return s.db.QueryRow(`SELECT created_at FROM media WHERE id=?`, m.ID).Scan(&m.CreatedAt)
}

func (s *Store) MediaByID(eventID, id int64) (*Media, error) {
	var m Media
	err := s.db.QueryRow(`SELECT id, event_id, kind, section, storage_key, mime, size_bytes, caption, sort_order, created_at
		FROM media WHERE id=? AND event_id=?`, id, eventID).
		Scan(&m.ID, &m.EventID, &m.Kind, &m.Section, &m.StorageKey, &m.Mime, &m.SizeBytes, &m.Caption, &m.SortOrder, &m.CreatedAt)
	if err != nil {
		return nil, ErrNotFound
	}
	return &m, nil
}

func (s *Store) DeleteMedia(eventID, id int64) error {
	res, err := s.db.Exec(`DELETE FROM media WHERE id=? AND event_id=?`, id, eventID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ReorderMedia aplica el orden que el admin definió arrastrando en el panel.
func (s *Store) ReorderMedia(eventID int64, ids []int64) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, id := range ids {
		if _, err := tx.Exec(`UPDATE media SET sort_order=? WHERE id=? AND event_id=?`, i, id, eventID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) UpdateMediaCaption(eventID, id int64, caption string) error {
	_, err := s.db.Exec(`UPDATE media SET caption=? WHERE id=? AND event_id=?`, caption, id, eventID)
	return err
}
