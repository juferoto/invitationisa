// Package store envuelve SQLite. Usamos database/sql a mano en vez de un ORM:
// el modelo es pequeño y así el SQL queda a la vista.
package store

import (
	"database/sql"
	"embed"
	"fmt"
	"sort"

	_ "modernc.org/sqlite" // driver en Go puro: sin cgo, binario estático
)

//go:embed all:migrations
var migrationsFS embed.FS

type Store struct {
	db *sql.DB
}

func Open(dsn string) (*Store, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// SQLite admite un solo escritor. Limitar el pool evita "database is locked".
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) DB() *sql.DB { return s.db }

// Migrate aplica en orden los .sql embebidos y registra cuáles ya corrieron.
func (s *Store) Migrate() error {
	if _, err := s.db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`); err != nil {
		return err
	}
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		var seen int
		if err := s.db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE name = ?`, name).Scan(&seen); err != nil {
			return err
		}
		if seen > 0 {
			continue
		}
		body, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		if _, err := s.db.Exec(string(body)); err != nil {
			return fmt.Errorf("migración %s: %w", name, err)
		}
		if _, err := s.db.Exec(`INSERT INTO schema_migrations (name) VALUES (?)`, name); err != nil {
			return err
		}
	}
	return nil
}
