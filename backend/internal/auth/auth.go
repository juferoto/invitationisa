// Package auth maneja el login del panel: hash de contraseña y token JWT.
package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const CookieName = "inv_session"

// SessionTTL es lo que dura una sesión del panel. Pasada la hora hay que
// volver a entrar.
const SessionTTL = time.Hour

var ErrInvalidToken = errors.New("sesión inválida o vencida")

// Claims es lo que viaja firmado dentro del token. Solo el identificador y el
// correo: nada sensible, porque un JWT va firmado pero no cifrado y cualquiera
// con el token puede leer su contenido.
type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

func HashPassword(plain string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(h), err
}

func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// NewToken firma un JWT que vence en SessionTTL y devuelve también la fecha de
// vencimiento, para poder darle la misma vida a la cookie.
func NewToken(secret []byte, userID int64, email string) (string, time.Time, error) {
	expires := time.Now().Add(SessionTTL)
	claims := Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprint(userID),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expires),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	return signed, expires, err
}

// ParseToken valida firma y vencimiento.
func ParseToken(secret []byte, raw string) (*Claims, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(raw, &claims, func(t *jwt.Token) (any, error) {
		// Sin esta comprobación, un atacante podría presentar un token con
		// alg "none" o cambiar a otro algoritmo para saltarse la firma.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("algoritmo inesperado: %v", t.Header["alg"])
		}
		return secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, ErrInvalidToken
	}
	return &claims, nil
}

// RandomSecret genera una clave de firma cuando no hay una configurada.
func RandomSecret() []byte {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return []byte(base64.RawURLEncoding.EncodeToString(b))
}
