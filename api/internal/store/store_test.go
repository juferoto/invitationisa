package store

import "testing"

// Las migraciones dejaron de ejecutarse de una pieza para poder hablar con
// Turso, y el que las parte es el único sitio donde un error pasaría
// inadvertido: una sentencia mal cortada se aplicaría a medias.
func TestSplitStatements(t *testing.T) {
	cases := []struct {
		nombre string
		sql    string
		quiere []string
	}{
		{
			nombre: "sentencias sueltas",
			sql:    "CREATE TABLE a (id INTEGER);\nCREATE TABLE b (id INTEGER);",
			quiere: []string{"CREATE TABLE a (id INTEGER)", "CREATE TABLE b (id INTEGER)"},
		},
		{
			nombre: "punto y coma dentro de un texto",
			sql:    "INSERT INTO a VALUES ('uno; dos');",
			quiere: []string{"INSERT INTO a VALUES ('uno; dos')"},
		},
		{
			nombre: "comilla escapada",
			sql:    "INSERT INTO a VALUES ('D''Angelo; Jr');",
			quiere: []string{"INSERT INTO a VALUES ('D''Angelo; Jr')"},
		},
		{
			nombre: "comentario con apóstrofo",
			sql:    "-- aquí no se parte; ni la comilla de 'esto' cuenta\nSELECT 1;",
			quiere: []string{"SELECT 1"},
		},
		{
			nombre: "sin punto y coma final",
			sql:    "SELECT 1",
			quiere: []string{"SELECT 1"},
		},
		{
			nombre: "solo comentarios y espacios",
			sql:    "-- nada que hacer\n\n;\n",
			quiere: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.nombre, func(t *testing.T) {
			got := splitStatements(c.sql)
			if len(got) != len(c.quiere) {
				t.Fatalf("salieron %d sentencias, se esperaban %d: %q", len(got), len(c.quiere), got)
			}
			for i := range got {
				if got[i] != c.quiere[i] {
					t.Errorf("sentencia %d:\n  salió:    %q\n  esperada: %q", i, got[i], c.quiere[i])
				}
			}
		})
	}
}

func TestDriverFor(t *testing.T) {
	cases := map[string]string{
		"file:data/invitation.db?_pragma=journal_mode(WAL)": "sqlite",
		"data/invitation.db":                                "sqlite",
		"libsql://invitacion-juan.turso.io?authToken=abc":   "libsql",
		"https://invitacion-juan.turso.io":                  "libsql",
	}
	for dsn, quiere := range cases {
		if got := driverFor(dsn); got != quiere {
			t.Errorf("driverFor(%q) = %q, se esperaba %q", dsn, got, quiere)
		}
	}
}
