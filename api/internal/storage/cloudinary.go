package storage

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Cloudinary guarda los medios fuera del servidor y los sirve por su propia
// red de distribución.
//
// Se eligió frente a un almacén compatible con S3 por una razón práctica: su
// plan gratuito no pide tarjeta y, al agotarse, deja de servir en vez de
// facturar. Eso convierte el peor caso —alguien descargando el video en
// bucle— en una molestia recuperable y no en una factura.
type Cloudinary struct {
	cloud     string
	apiKey    string
	apiSecret string
	client    *http.Client
}

func NewCloudinary(cloud, apiKey, apiSecret string) (*Cloudinary, error) {
	if cloud == "" || apiKey == "" || apiSecret == "" {
		return nil, fmt.Errorf("cloudinary: faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET")
	}
	return &Cloudinary{
		cloud:     cloud,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		// El video son varios MB: el tiempo por defecto de Go no caduca, pero
		// más vale fallar que dejar una subida colgada para siempre.
		client: &http.Client{Timeout: 5 * time.Minute},
	}, nil
}

// cloudinaryKind traduce nuestras carpetas a los tres tipos que Cloudinary
// distingue. El audio viaja como "video": es su forma de clasificar todo lo
// que tiene pista de sonido, no un error.
func cloudinaryKind(key string) string {
	switch strings.SplitN(key, "/", 2)[0] {
	case "image":
		return "image"
	case "video", "audio":
		return "video"
	default:
		return "raw"
	}
}

// cloudinaryID convierte la clave en el identificador que usa Cloudinary.
//
// Para imagen y video el identificador va sin extensión —Cloudinary la añade
// según el formato real del archivo— y para "raw" la conserva. Mantenerlo
// derivado de la clave es lo que permite construir la URL sin preguntar nada
// al servicio.
func cloudinaryID(key string) string {
	if cloudinaryKind(key) == "raw" {
		return key
	}
	return strings.TrimSuffix(key, path.Ext(key))
}

// sign firma los parámetros como exige Cloudinary: ordenados por nombre,
// unidos con &, el secreto pegado al final y todo pasado por SHA-1.
func (c *Cloudinary) sign(params map[string]string) string {
	names := make([]string, 0, len(params))
	for name := range params {
		names = append(names, name)
	}
	sort.Strings(names)

	var b strings.Builder
	for i, name := range names {
		if i > 0 {
			b.WriteByte('&')
		}
		b.WriteString(name)
		b.WriteByte('=')
		b.WriteString(params[name])
	}
	b.WriteString(c.apiSecret)

	sum := sha1.Sum([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

func (c *Cloudinary) endpoint(kind, action string) string {
	return fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/%s/%s", c.cloud, kind, action)
}

// do envía una llamada firmada con parámetros de formulario simples.
func (c *Cloudinary) do(ctx context.Context, kind, action string, params map[string]string) error {
	form := url.Values{}
	for name, value := range params {
		form.Set(name, value)
	}
	form.Set("signature", c.sign(params))
	form.Set("api_key", c.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint(kind, action), strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return cloudinaryError(action, resp)
}

// cloudinaryError convierte una respuesta fallida en un error legible. La API
// devuelve el motivo en un JSON {"error":{"message":"..."}}.
func cloudinaryError(action string, resp *http.Response) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	var body struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
	if json.Unmarshal(raw, &body) == nil && body.Error.Message != "" {
		return fmt.Errorf("cloudinary %s: %s", action, body.Error.Message)
	}
	return fmt.Errorf("cloudinary %s: %s", action, resp.Status)
}

func (c *Cloudinary) Put(ctx context.Context, key string, r io.Reader, contentType string, size int64) error {
	params := map[string]string{
		"public_id": cloudinaryID(key),
		"timestamp": strconv.FormatInt(time.Now().Unix(), 10),
		// Con un identificador propio no queremos que Cloudinary le añada un
		// sufijo aleatorio: la URL dejaría de poder deducirse de la clave.
		"overwrite": "true",
	}
	signature := c.sign(params)

	// El archivo se transmite mientras se lee, sin cargarlo entero en memoria:
	// el video puede pesar más que toda la RAM disponible de una máquina
	// pequeña.
	pr, pw := io.Pipe()
	form := multipart.NewWriter(pw)

	go func() {
		err := func() error {
			for name, value := range params {
				if err := form.WriteField(name, value); err != nil {
					return err
				}
			}
			if err := form.WriteField("signature", signature); err != nil {
				return err
			}
			if err := form.WriteField("api_key", c.apiKey); err != nil {
				return err
			}
			part, err := form.CreateFormFile("file", path.Base(key))
			if err != nil {
				return err
			}
			if _, err := io.Copy(part, r); err != nil {
				return err
			}
			return form.Close()
		}()
		// Cerrar con el error hace que la petición HTTP falle en vez de
		// enviar un cuerpo truncado que Cloudinary aceptaría a medias.
		pw.CloseWithError(err)
	}()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint(cloudinaryKind(key), "upload"), pr)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", form.FormDataContentType())

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return cloudinaryError("upload", resp)
}

func (c *Cloudinary) Move(ctx context.Context, oldKey, newKey string) error {
	return c.do(ctx, cloudinaryKind(oldKey), "rename", map[string]string{
		"from_public_id": cloudinaryID(oldKey),
		"to_public_id":   cloudinaryID(newKey),
		"overwrite":      "true",
		// Sin invalidar, la dirección antigua seguiría sirviendo el archivo
		// desde la caché aunque ya no exista con ese nombre.
		"invalidate": "true",
		"timestamp":  strconv.FormatInt(time.Now().Unix(), 10),
	})
}

func (c *Cloudinary) Delete(ctx context.Context, key string) error {
	return c.do(ctx, cloudinaryKind(key), "destroy", map[string]string{
		"public_id": cloudinaryID(key),
		// Sin esto el archivo sigue viviendo en la caché de la red de
		// distribución después de borrarlo del almacén.
		"invalidate": "true",
		"timestamp":  strconv.FormatInt(time.Now().Unix(), 10),
	})
}

// URL se construye con la misma regla que el identificador, sin consultar a
// Cloudinary: la dirección de un archivo se puede deducir de su clave.
func (c *Cloudinary) URL(key string) string {
	return fmt.Sprintf("https://res.cloudinary.com/%s/%s/upload/%s",
		c.cloud, cloudinaryKind(key), key)
}
