// Comando server: API del CRM de invitaciones.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/juanrodriguez/invitationisa/backend/internal/api"
	"github.com/juanrodriguez/invitationisa/backend/internal/auth"
	"github.com/juanrodriguez/invitationisa/backend/internal/config"
	"github.com/juanrodriguez/invitationisa/backend/internal/storage"
	"github.com/juanrodriguez/invitationisa/backend/internal/store"
)

func main() {
	cfg := config.Load()

	if err := ensureDBDir(cfg.DatabaseDSN); err != nil {
		log.Fatalf("no se pudo preparar la carpeta de la base: %v", err)
	}
	st, err := store.Open(cfg.DatabaseDSN)
	if err != nil {
		log.Fatalf("no se pudo abrir la base: %v", err)
	}
	defer st.Close()

	if err := st.Migrate(); err != nil {
		log.Fatalf("migraciones: %v", err)
	}
	if err := st.RenormalizeSongs(); err != nil {
		log.Fatalf("normalizar canciones: %v", err)
	}
	if err := seedAdmin(st, cfg); err != nil {
		log.Fatalf("admin inicial: %v", err)
	}
	if err := seedEvent(st); err != nil {
		log.Fatalf("evento inicial: %v", err)
	}

	files, err := buildStorage(cfg)
	if err != nil {
		log.Fatalf("almacenamiento: %v", err)
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.New(cfg, st, files).Router(),
		ReadHeaderTimeout: 10 * time.Second,
		// Sin WriteTimeout: subir un video de 100 MB puede tardar más que cualquier
		// límite razonable. El tamaño lo controla MaxUploadBytes.
		IdleTimeout: 60 * time.Second,
	}

	go func() {
		log.Printf("escuchando en %s (almacenamiento: %s)", cfg.Addr, cfg.StorageDriver)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("servidor: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("apagado: %v", err)
	}
	log.Println("servidor detenido")
}

func buildStorage(cfg config.Config) (storage.Store, error) {
	if cfg.StorageDriver == "s3" {
		return storage.NewS3(cfg.S3Endpoint, cfg.S3AccessKey, cfg.S3SecretKey, cfg.S3Region, cfg.S3Bucket, cfg.StorageBaseURL)
	}
	return storage.NewLocal(cfg.StorageLocalDir, cfg.StorageBaseURL)
}

// ensureDBDir crea la carpeta del archivo .db antes de que SQLite intente abrirlo.
func ensureDBDir(dsn string) error {
	path := strings.TrimPrefix(dsn, "file:")
	if i := strings.Index(path, "?"); i >= 0 {
		path = path[:i]
	}
	dir := filepath.Dir(path)
	if dir == "" || dir == "." {
		return nil
	}
	return os.MkdirAll(dir, 0o755)
}

// seedAdmin crea el primer usuario solo si la tabla está vacía.
func seedAdmin(st *store.Store, cfg config.Config) error {
	n, err := st.CountAdmins()
	if err != nil || n > 0 {
		return err
	}
	hash, err := auth.HashPassword(cfg.SeedAdminPassword)
	if err != nil {
		return err
	}
	email := strings.ToLower(cfg.SeedAdminEmail)
	if err := st.CreateAdmin(email, hash); err != nil {
		return err
	}
	log.Printf("admin inicial creado: %s (cambia la contraseña con SEED_ADMIN_PASSWORD antes de producción)", email)
	return nil
}

// seedEvent deja un evento de ejemplo para que el panel no arranque vacío.
func seedEvent(st *store.Store) error {
	_, err := st.CurrentEvent()
	if err == nil {
		return nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return err
	}
	ev := &store.Event{
		Slug:           "mis-xv",
		CelebrantName:  "Isabella",
		Title:          "Mis XV Años",
		IntroMessage:   "Con mucha alegría te invito a celebrar mis 15 años, un momento muy especial en mi vida.",
		EventDate:      time.Now().AddDate(0, 6, 0).Format(time.RFC3339),
		DressCodeStyle: "Formal elegante",
		DressCodeWomen: "Vestido largo",
		DressCodeMen:   "Traje formal",
		GiftMessage:    "Lluvia de sobres.",
		Notes:          "Te esperamos puntual. Hay parqueadero disponible.",
		ThemePrimary:   "#184aaf",
		ThemeAccent:    "#dcc888",
	}
	if err := st.CreateEvent(ev); err != nil {
		return err
	}
	if err := st.ReplaceVenues(ev.ID, []store.Venue{
		{Kind: "ceremony", Name: "Parroquia", City: "Medellín", StartsAt: "17:00"},
		{Kind: "reception", Name: "Salón de eventos", City: "Medellín", StartsAt: "19:00"},
	}); err != nil {
		return err
	}
	if err := st.ReplaceDetails(ev.ID, []store.PartyDetail{
		{Title: "Puntualidad", Icon: "clock",
			Description: "Tu presencia puntual hará parte de este recuerdo inolvidable."},
		{Title: "Estacionamiento", Icon: "parking",
			Description: "Contaremos con servicio de estacionamiento para tu comodidad."},
		{Title: "Confirma tu asistencia", Icon: "calendar",
			Description: "Agradecemos confirmar a tiempo para preparar este día tan especial."},
	}); err != nil {
		return err
	}
	return st.ReplaceItinerary(ev.ID, []store.ItineraryItem{
		{TimeLabel: "19:00", Title: "Recepción"},
		{TimeLabel: "20:00", Title: "Cena"},
		{TimeLabel: "21:00", Title: "Brindis"},
		{TimeLabel: "21:30", Title: "Vals"},
		{TimeLabel: "22:00", Title: "Baile"},
	})
}
