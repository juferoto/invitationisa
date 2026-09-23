package api

import (
	"testing"
	"time"
)

// El plazo decide si una confirmación entra o se rechaza, y se compara contra
// una hora escrita sin huso. Un error aquí cierra el plazo cinco horas antes
// de tiempo, o lo deja abierto cuando ya venció, y en ninguno de los dos casos
// se nota hasta que alguien se queda fuera.
func TestRsvpClosed(t *testing.T) {
	bogota, err := time.LoadLocation(eventZone)
	if err != nil {
		t.Fatalf("sin husos horarios en el binario: %v", err)
	}
	// Las 23:30 en Cali del día del límite. En UTC ya es el día siguiente:
	// comparar sin cuidado daría el plazo por vencido.
	enCali := func(y int, m time.Month, d, h, min int) time.Time {
		return time.Date(y, m, d, h, min, 0, 0, bogota)
	}

	cases := []struct {
		nombre   string
		limite   string
		ahora    time.Time
		esperado bool
	}{
		{"sin límite, siempre abierto", "", enCali(2030, time.January, 1, 12, 0), false},
		{"un minuto antes", "2027-02-15T23:59", enCali(2027, time.February, 15, 23, 58), false},
		{"justo después", "2027-02-15T23:59", enCali(2027, time.February, 16, 0, 1), true},
		{"a media tarde del mismo día", "2027-02-15T23:59", enCali(2027, time.February, 15, 16, 0), false},
		{"fecha suelta: vale todo el día", "2027-02-15", enCali(2027, time.February, 15, 23, 0), false},
		{"fecha suelta: al día siguiente ya no", "2027-02-15", enCali(2027, time.February, 16, 0, 30), true},
		{"fecha ilegible deja el plazo abierto", "el viernes", enCali(2030, time.January, 1, 12, 0), false},
		// Este es el formato que guarda de verdad el panel: el navegador
		// convierte lo escrito a UTC y le añade milisegundos. Si el parser no
		// lo entendiera, el plazo no se aplicaría nunca y nadie se enteraría.
		{"formato real del panel, antes", "2027-02-16T04:59:00.000Z", enCali(2027, time.February, 15, 20, 0), false},
		{"formato real del panel, después", "2027-02-16T04:59:00.000Z", enCali(2027, time.February, 16, 0, 5), true},
	}

	for _, c := range cases {
		t.Run(c.nombre, func(t *testing.T) {
			if got := rsvpClosed(c.limite, c.ahora); got != c.esperado {
				t.Errorf("rsvpClosed(%q) = %v, se esperaba %v", c.limite, got, c.esperado)
			}
		})
	}
}

// El servidor corre en UTC. Si el límite se interpretara en esa zona en vez de
// en la del evento, el plazo se cerraría cinco horas antes de lo que dice la
// invitación: a las 19:00 de Cali del día del límite.
func TestDeadlineUsaLaHoraDelEvento(t *testing.T) {
	limite, ok := parseDeadline("2027-02-15T23:59")
	if !ok {
		t.Fatal("no se entendió el límite")
	}
	if got := limite.UTC().Format("2006-01-02 15:04"); got != "2027-02-16 04:59" {
		t.Errorf("el límite en UTC es %s, se esperaba 2027-02-16 04:59 (23:59 en Cali)", got)
	}
}
