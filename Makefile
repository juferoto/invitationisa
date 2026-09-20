.PHONY: dev-api dev-web build test

dev-api:
	cd backend && go run ./cmd/server

dev-web:
	cd frontend && npm run dev

build:
	cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server
	cd frontend && npm run build

test:
	cd backend && go vet ./... && go test ./...
	cd frontend && npx tsc --noEmit
