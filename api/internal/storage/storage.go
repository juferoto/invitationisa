// Package storage abstrae dónde viven las fotos, el audio y el video.
// La base de datos solo guarda la clave y la URL; el archivo nunca entra a SQLite.
package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"mime"
	"path"
	"strings"
)

type Store interface {
	// Put sube el contenido y devuelve la clave con la que quedó guardado.
	Put(ctx context.Context, key string, r io.Reader, contentType string, size int64) error
	// Move reubica un archivo ya guardado, para reorganizar el almacén sin
	// volver a subirlo.
	Move(ctx context.Context, oldKey, newKey string) error
	Delete(ctx context.Context, key string) error
	// URL devuelve la dirección pública para servir el archivo.
	URL(key string) string
}

// extFamilyMatches indica si la extensión pertenece a la misma familia
// (image/, audio/, video/) que el tipo declarado por el navegador.
func extFamilyMatches(ext, contentType string) bool {
	byExt := mime.TypeByExtension(ext)
	if byExt == "" {
		return false
	}
	family := func(v string) string { return strings.SplitN(v, "/", 2)[0] }
	return family(byExt) == family(contentType)
}

// preferredExt elige la extensión más reconocible de las que corresponden a un
// tipo. mime.ExtensionsByType devuelve varias y el orden no es estable.
func preferredExt(exts []string) string {
	for _, want := range []string{".mp3", ".jpg", ".png", ".mp4", ".webp", ".m4a", ".ogg"} {
		for _, e := range exts {
			if e == want {
				return e
			}
		}
	}
	shortest := exts[0]
	for _, e := range exts {
		if len(e) < len(shortest) {
			shortest = e
		}
	}
	return shortest
}

// NewKey genera una clave única con una extensión coherente con el tipo real
// del archivo, porque el servidor estático deduce el Content-Type de ella.
//
// Hace falta porque algunas extensiones son ambiguas: ".mpeg" se resuelve como
// video/mpeg aunque el archivo sea un MP3, y entonces el <audio> del navegador
// recibe un tipo de vídeo.
func NewKey(kind, section, filename, contentType string) string {
	ext := strings.ToLower(path.Ext(filename))
	if ext == "" || !extFamilyMatches(ext, contentType) {
		if exts, err := mime.ExtensionsByType(contentType); err == nil && len(exts) > 0 {
			ext = preferredExt(exts)
		}
	}
	buf := make([]byte, 12)
	_, _ = rand.Read(buf)
	return KeyFor(kind, section, hex.EncodeToString(buf)+ext)
}

// KeyFor es la única función que decide la ruta de un archivo en el almacén:
// primero el tipo (image, audio, video) y dentro la sección de la invitación.
// Tenerlo en un solo sitio evita que cada parte del código invente su propia
// convención.
func KeyFor(kind, section, filename string) string {
	if section == "" {
		section = "otros"
	}
	// La sección del video de entrada se llama igual que su tipo; sin esto la
	// ruta quedaría como "video/video/".
	if section == kind {
		return path.Join(kind, filename)
	}
	return path.Join(kind, section, filename)
}

// KindFor clasifica el archivo en las tres categorías que maneja la invitación.
func KindFor(contentType string) string {
	switch {
	case strings.HasPrefix(contentType, "image/"):
		return "image"
	case strings.HasPrefix(contentType, "audio/"):
		return "audio"
	case strings.HasPrefix(contentType, "video/"):
		return "video"
	default:
		return ""
	}
}
