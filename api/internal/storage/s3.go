package storage

import (
	"context"
	"io"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3 sirve para cualquier almacenamiento compatible con S3. Está pensado para
// Cloudflare R2, que no cobra egreso: clave cuando se sirve video.
type S3 struct {
	client  *minio.Client
	bucket  string
	baseURL string
}

func NewS3(endpoint, accessKey, secretKey, region, bucket, baseURL string) (*S3, error) {
	// El endpoint se configura sin esquema; https se asume salvo que se indique http.
	secure := !strings.HasPrefix(endpoint, "http://")
	host := strings.TrimPrefix(strings.TrimPrefix(endpoint, "https://"), "http://")

	client, err := minio.New(host, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: secure,
		Region: region,
	})
	if err != nil {
		return nil, err
	}
	return &S3{client: client, bucket: bucket, baseURL: strings.TrimRight(baseURL, "/")}, nil
}

func (s *S3) Put(ctx context.Context, key string, r io.Reader, contentType string, size int64) error {
	if size <= 0 {
		size = -1 // desconocido: minio hace upload multipart en streaming
	}
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{
		ContentType: contentType,
		// Los medios de una invitación no cambian: cache larga en el CDN.
		CacheControl: "public, max-age=31536000, immutable",
	})
	return err
}

// Move copia y borra: S3 no tiene una operación de renombrado.
func (s *S3) Move(ctx context.Context, oldKey, newKey string) error {
	_, err := s.client.CopyObject(ctx,
		minio.CopyDestOptions{Bucket: s.bucket, Object: newKey},
		minio.CopySrcOptions{Bucket: s.bucket, Object: oldKey})
	if err != nil {
		return err
	}
	return s.client.RemoveObject(ctx, s.bucket, oldKey, minio.RemoveObjectOptions{})
}

func (s *S3) Delete(ctx context.Context, key string) error {
	return s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}

func (s *S3) URL(key string) string { return s.baseURL + "/" + key }
