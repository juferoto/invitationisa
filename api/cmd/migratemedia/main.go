// Command migratemedia copia archivos ya subidos de un almacén a otro.
//
// Cambiar STORAGE_DRIVER no mueve nada: la base guarda la clave del archivo y
// la dirección se calcula al leerla, así que tras el cambio las claves apuntan
// a un almacén donde todavía no está el contenido. Esta herramienta descarga
// cada archivo del almacén viejo y lo sube al nuevo con la misma clave, de
// modo que la base no se toca y las direcciones siguen resolviendo.
//
//	fly ssh console -a TU-APP -C 'true'   # no hace falta: los medios son públicos
//	curl -b cookie https://TU-API/api/admin/media | jq -r '.[].url' |
//	  sed 's|.*/media/||' |
//	  go run ./cmd/migratemedia -from https://TU-API/media
//
// Las claves se leen de la entrada estándar, una por línea. El almacén de
// destino es el que digan las variables de entorno, igual que para el
// servidor.
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/juanrodriguez/invitationisa/api/internal/config"
	"github.com/juanrodriguez/invitationisa/api/internal/storage"
)

func main() {
	from := flag.String("from", "", "dirección base del almacén de origen, por ejemplo https://api.ejemplo.com/media")
	flag.Parse()

	if *from == "" {
		log.Fatal("falta -from: la dirección base desde la que descargar los archivos")
	}
	origen := strings.TrimRight(*from, "/")

	cfg := config.Load()
	destino, err := nuevoAlmacen(cfg)
	if err != nil {
		log.Fatalf("almacén de destino: %v", err)
	}
	log.Printf("destino: %s", cfg.StorageDriver)

	client := &http.Client{Timeout: 5 * time.Minute}
	ctx := context.Background()

	var copiados, fallos int
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		key := strings.TrimSpace(scanner.Text())
		if key == "" {
			continue
		}
		if err := copiar(ctx, client, origen, key, destino); err != nil {
			log.Printf("  ✗ %s: %v", key, err)
			fallos++
			continue
		}
		log.Printf("  ✓ %s", key)
		copiados++
	}
	if err := scanner.Err(); err != nil {
		log.Fatalf("leyendo las claves: %v", err)
	}

	log.Printf("%d copiados, %d fallidos", copiados, fallos)
	if fallos > 0 {
		os.Exit(1)
	}
}

func copiar(ctx context.Context, client *http.Client, origen, key string, destino storage.Store) error {
	resp, err := client.Get(origen + "/" + key)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("descarga: %s", resp.Status)
	}

	// El tamaño va explícito cuando el origen lo declara: algunos almacenes
	// lo necesitan para no tener que acumular el archivo en memoria.
	size := resp.ContentLength
	contentType := resp.Header.Get("Content-Type")

	return destino.Put(ctx, key, resp.Body, contentType, size)
}

// nuevoAlmacen repite la elección que hace el servidor, para que la migración
// escriba exactamente donde va a leer él.
func nuevoAlmacen(cfg config.Config) (storage.Store, error) {
	switch cfg.StorageDriver {
	case "cloudinary":
		return storage.NewCloudinary(cfg.CloudinaryCloud, cfg.CloudinaryKey, cfg.CloudinarySecret)
	case "s3":
		return storage.NewS3(cfg.S3Endpoint, cfg.S3AccessKey, cfg.S3SecretKey, cfg.S3Region, cfg.S3Bucket, cfg.StorageBaseURL)
	default:
		return storage.NewLocal(cfg.StorageLocalDir, cfg.StorageBaseURL)
	}
}
