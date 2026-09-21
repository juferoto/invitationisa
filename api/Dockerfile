# Compilación estática: modernc.org/sqlite es Go puro, así que no hace falta cgo
# y la imagen final puede ser distroless.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./api/
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/server /server
ENV ADDR=:8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
