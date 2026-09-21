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

// RevokeToken anula un token concreto hasta que venza. Guardar el vencimiento
// permite limpiar después: pasado ese momento la fila ya no hace falta, porque
// el propio token deja de ser válido.
func (s *Store) RevokeToken(jti string, expires time.Time) error {
	_, err := s.db.Exec(`INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?,?)`,
		jti, expires.UTC().Format(time.RFC3339))
	return err
}

// IsTokenRevoked comprueba la lista y de paso borra lo ya vencido, para que la
// tabla no crezca indefinidamente.
func (s *Store) IsTokenRevoked(jti string) (bool, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	_, _ = s.db.Exec(`DELETE FROM revoked_tokens WHERE expires_at < ?`, now)

	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM revoked_tokens WHERE jti = ?`, jti).Scan(&n); err != nil {
		return false, err
	}
	return n > 0, nil
}

// TokensValidFrom devuelve el momento a partir del cual los tokens de este
// usuario se consideran válidos. Cero significa que no se ha revocado nada.
func (s *Store) TokensValidFrom(email string) (time.Time, error) {
	var raw string
	err := s.db.QueryRow(`SELECT tokens_valid_from FROM admin_users WHERE email = ?`, email).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return time.Time{}, ErrNotFound
	}
	if err != nil || raw == "" {
		return time.Time{}, err
	}
	return time.Parse(time.RFC3339, raw)
}

// RevokeAllTokens invalida todos los tokens emitidos hasta ahora para ese
// usuario, sin necesidad de listarlos.
func (s *Store) RevokeAllTokens(email string) error {
	// El `iat` de un JWT se mide en segundos enteros. Si se guardara el
	// instante actual, un token emitido en ese mismo segundo no quedaría
	// "estrictamente antes" y sobreviviría a la revocación. Se avanza un
	// segundo para que todo lo ya emitido caiga con seguridad del lado
	// revocado.
	cutoff := time.Now().UTC().Truncate(time.Second).Add(time.Second)
	_, err := s.db.Exec(`UPDATE admin_users SET tokens_valid_from = ? WHERE email = ?`,
		cutoff.Format(time.RFC3339), email)
	return err
}
