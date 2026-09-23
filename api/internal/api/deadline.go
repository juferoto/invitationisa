package api

import (
	"time"

	_ "time/tzdata" // la imagen del contenedor no trae la base de husos horarios
)

// eventZone es el huso donde ocurre la fiesta.
//
// El límite para confirmar se escribe en hora local de allí, no en la del
// invitado: quien responde desde Madrid tiene exactamente el mismo plazo que
// quien responde desde Cali. Si algún día el CRM sirviera eventos en otros
// países, esto dejaría de ser una constante y pasaría a ser un campo del
// evento.
const eventZone = "America/Bogota"

// deadlineFormats son las formas en que puede venir guardado el límite.
//
// La primera es la que usa el panel: convierte lo que se escribe en el
// calendario a un instante en UTC, así que llega con su huso incorporado y no
// hay nada que interpretar. Las demás cubren un valor escrito a mano o traído
// de otra parte, sin huso, y esas sí se leen como hora del lugar del evento.
var deadlineFormats = []string{
	time.RFC3339,
	"2006-01-02T15:04:05",
	"2006-01-02T15:04",
	"2006-01-02 15:04:05",
	"2006-01-02",
}

// parseDeadline interpreta el límite en la hora del lugar del evento.
//
// El valor guardado no lleva huso: "2027-02-15T23:59" significa las once y
// media de la noche en Cali, no en el servidor, que corre en otro continente.
// Devuelve false si no hay límite o no se entiende, y en ese caso el plazo
// queda abierto: más vale aceptar una confirmación de más que rechazar las de
// todo el mundo por una fecha mal escrita.
func parseDeadline(value string) (time.Time, bool) {
	if value == "" {
		return time.Time{}, false
	}
	loc, err := time.LoadLocation(eventZone)
	if err != nil {
		loc = time.UTC
	}
	for _, layout := range deadlineFormats {
		t, err := time.ParseInLocation(layout, value, loc)
		if err != nil {
			continue
		}
		// Una fecha sin hora vale hasta el final de ese día: quien escribe
		// "15 de febrero" quiere decir todo el 15, no las cero horas.
		if layout == "2006-01-02" {
			t = t.Add(24*time.Hour - time.Second)
		}
		return t, true
	}
	return time.Time{}, false
}

// rsvpClosed indica si ya pasó el plazo para confirmar.
func rsvpClosed(deadline string, now time.Time) bool {
	limit, ok := parseDeadline(deadline)
	if !ok {
		return false
	}
	return now.After(limit)
}
