FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY imagegen/go.mod imagegen/go.sum ./
RUN go mod download && go mod verify

COPY imagegen/*.go ./
RUN go build -o imagegen

FROM alpine:3.22
WORKDIR /app
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/imagegen /app/imagegen
COPY imagegen/fonts /app/assets/fonts/
COPY imagegen/icons /app/assets/icons/

ENV IMAGEGEN_ASSETS_DIR=/app/assets
ENV IMAGEGEN_WWW_DIR=/app/www
ENV IMAGEGEN_OUT_DIR=/app/www

CMD ["./imagegen"]
