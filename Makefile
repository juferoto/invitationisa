.PHONY: dev-api dev-web build test

dev-api:
	cd api && go run ./cmd/server

dev-web:
	cd web && npm run dev

build:
	cd api && CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server
	cd web && npm run build

test:
	cd api && go vet ./... && go test ./...
	cd web && npx tsc --noEmit
