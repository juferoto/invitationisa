package store

import (
	"database/sql"
	"errors"
	"time"
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

func (s *Store) CreateSession(token string, userID int64, expires time.Time) error {
	_, err := s.db.Exec(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)`,
		token, userID, expires.UTC().Format(time.RFC3339))
	return err
}

// SessionUser valida el token y de paso limpia las sesiones vencidas.
func (s *Store) SessionUser(token string) (*AdminUser, error) {
	_, _ = s.db.Exec(`DELETE FROM sessions WHERE expires_at < ?`, time.Now().UTC().Format(time.RFC3339))
	var u AdminUser
	err := s.db.QueryRow(`SELECT u.id, u.email, u.password_hash
		FROM sessions s JOIN admin_users u ON u.id = s.user_id
		WHERE s.token = ? AND s.expires_at > ?`, token, time.Now().UTC().Format(time.RFC3339)).
		Scan(&u.ID, &u.Email, &u.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (s *Store) DeleteSession(token string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE token=?`, token)
	return err
}
