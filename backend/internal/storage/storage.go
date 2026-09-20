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
	Delete(ctx context.Context, key string) error
	// URL devuelve la dirección pública para servir el archivo.
	URL(key string) string
}

// NewKey genera una clave única conservando la extensión original, para que
// el navegador siga recibiendo el Content-Type correcto al servir el archivo.
func NewKey(section, filename, contentType string) string {
	ext := strings.ToLower(path.Ext(filename))
	if ext == "" {
		if exts, err := mime.ExtensionsByType(contentType); err == nil && len(exts) > 0 {
			ext = exts[0]
		}
	}
	buf := make([]byte, 12)
	_, _ = rand.Read(buf)
	return path.Join(section, hex.EncodeToString(buf)+ext)
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
