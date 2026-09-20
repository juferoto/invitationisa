package store

import (
	"database/sql"
	"errors"
)

type AdminUser struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
}

func (s *Store) CountAdmins() (int, error) {
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM admin_users`).Scan(&n)
	return n, err
}

func (s *Store) CreateAdmin(email, passwordHash string) error {
	_, err := s.db.Exec(`INSERT INTO admin_users (email, password_hash) VALUES (?,?)`, email, passwordHash)
	return err
}

func (s *Store) AdminByEmail(email string) (*AdminUser, error) {
	var u AdminUser
	err := s.db.QueryRow(`SELECT id, email, password_hash FROM admin_users WHERE email=?`, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}
