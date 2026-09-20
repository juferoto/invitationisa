package storage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Local guarda los archivos en disco. Es el driver de desarrollo y funciona
// perfectamente en producción si montas un volumen persistente.
type Local struct {
	dir     string
	baseURL string
}

func NewLocal(dir, baseURL string) (*Local, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Local{dir: dir, baseURL: strings.TrimRight(baseURL, "/")}, nil
}

func (l *Local) Put(_ context.Context, key string, r io.Reader, _ string, _ int64) error {
	dest := filepath.Join(l.dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		return err
	}
	return f.Sync()
}

func (l *Local) Delete(_ context.Context, key string) error {
	err := os.Remove(filepath.Join(l.dir, filepath.FromSlash(key)))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (l *Local) URL(key string) string { return l.baseURL + "/" + key }

// Dir expone la carpeta para poder servirla con http.FileServer.
func (l *Local) Dir() string { return l.dir }
