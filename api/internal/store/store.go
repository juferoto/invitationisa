// Package store envuelve SQLite. Usamos database/sql a mano en vez de un ORM:
// el modelo es pequeño y así el SQL queda a la vista.
package store

import (
	"database/sql"
	"embed"
	"fmt"
	"sort"
	"strings"

	_ "github.com/tursodatabase/libsql-client-go/libsql" // Turso: la misma SQLite, servida por red
	_ "modernc.org/sqlite"                               // driver en Go puro: sin cgo, binario estático
)

//go:embed all:migrations
var migrationsFS embed.FS

type Store struct {
	db *sql.DB
}

// driverFor decide el controlador mirando el DSN. Una ruta de archivo usa la
// SQLite incrustada en el binario; una dirección `libsql://` es una base de
// Turso, la misma SQLite pero al otro lado de la red. El SQL no cambia: por eso
// se puede pasar de una a otra sin tocar las consultas.
func driverFor(dsn string) string {
	for _, prefix := range []string{"libsql://", "wss://", "ws://", "https://", "http://"} {
		if strings.HasPrefix(dsn, prefix) {
			return "libsql"
		}
	}
	return "sqlite"
}

func Open(dsn string) (*Store, error) {
	driver := driverFor(dsn)
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}
	if driver == "sqlite" {
		// SQLite admite un solo escritor. Limitar el pool evita "database is locked".
		db.SetMaxOpenConns(1)
	} else {
		// Contra Turso cada consulta viaja por HTTP y el servidor ya serializa
		// las escrituras. Un pool corto aprovecha la concurrencia de lectura
		// sin abrir conexiones de más en una máquina pequeña.
		db.SetMaxOpenConns(4)
		db.SetMaxIdleConns(2)
	}
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
		for _, stmt := range splitStatements(string(body)) {
			if _, err := s.db.Exec(stmt); err != nil {
				return fmt.Errorf("migración %s: %w", name, err)
			}
		}
		if _, err := s.db.Exec(`INSERT INTO schema_migrations (name) VALUES (?)`, name); err != nil {
			return err
		}
	}
	return nil
}

// splitStatements parte un archivo .sql en sentencias sueltas.
//
// La SQLite incrustada acepta varias sentencias en una sola llamada; Turso no,
// porque cada una viaja en su propia petición. Partir por el punto y coma a
// ciegas rompería cualquiera que llevara uno dentro de un texto o de un
// comentario, así que se recorre el archivo sabiendo en todo momento si vamos
// por dentro de una cadena o de un comentario.
func splitStatements(body string) []string {
	var (
		out       []string
		current   strings.Builder
		inString  bool
		inComment bool
	)
	flush := func() {
		if stmt := strings.TrimSpace(current.String()); stmt != "" {
			out = append(out, stmt)
		}
		current.Reset()
	}

	for i := 0; i < len(body); i++ {
		c := body[i]
		switch {
		case inComment:
			if c == '\n' {
				inComment = false
			}
		case !inString && c == '-' && i+1 < len(body) && body[i+1] == '-':
			inComment = true
			i++ // el segundo guion
		case c == '\'':
			// Dos comillas seguidas son una comilla escapada, no un cierre.
			if inString && i+1 < len(body) && body[i+1] == '\'' {
				current.WriteString("''")
				i++
				continue
			}
			inString = !inString
			current.WriteByte(c)
		case c == ';' && !inString:
			flush()
		default:
			current.WriteByte(c)
		}
	}
	flush()
	return out
}
