package config

import (
	"os"
	"strconv"
)

// Config se arma solo desde variables de entorno: así el mismo binario sirve
// para local, staging y producción sin recompilar.
type Config struct {
	Addr        string
	DatabaseDSN string
	PublicURL   string // base para construir los links de invitado
	CORSOrigin  string

	// Almacenamiento de medios. Driver "local" en desarrollo, "s3" para R2.
	StorageDriver   string
	StorageLocalDir string
	StorageBaseURL  string
	S3Endpoint      string
	S3Bucket        string
	S3AccessKey     string
	S3SecretKey     string
	S3Region        string

	MaxUploadBytes int64

	// Credenciales del admin inicial; solo se usan si no existe ningún usuario.
	SeedAdminEmail    string
	SeedAdminPassword string
}

func Load() Config {
	return Config{
		Addr:              env("ADDR", ":8080"),
		DatabaseDSN:       env("DATABASE_DSN", "file:data/invitation.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"),
		PublicURL:         env("PUBLIC_URL", "http://localhost:3000"),
		CORSOrigin:        env("CORS_ORIGIN", "http://localhost:3000"),
		StorageDriver:     env("STORAGE_DRIVER", "local"),
		StorageLocalDir:   env("STORAGE_LOCAL_DIR", "data/media"),
		StorageBaseURL:    env("STORAGE_BASE_URL", "http://localhost:8080/media"),
		S3Endpoint:        env("S3_ENDPOINT", ""),
		S3Bucket:          env("S3_BUCKET", ""),
		S3AccessKey:       env("S3_ACCESS_KEY", ""),
		S3SecretKey:       env("S3_SECRET_KEY", ""),
		S3Region:          env("S3_REGION", "auto"),
		MaxUploadBytes:    envInt64("MAX_UPLOAD_BYTES", 128<<20), // 128 MB, suficiente para video corto
		SeedAdminEmail:    env("SEED_ADMIN_EMAIL", "admin@local"),
		SeedAdminPassword: env("SEED_ADMIN_PASSWORD", "cambiame"),
	}
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt64(key string, def int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return def
}
