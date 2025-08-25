#!/bin/bash
go clean -cache

EXE_NAME="builds/looma-service-$1"
LDFLAGS="-X 'main.Cliente=$1'"

if [ -n "$2" ]; then
  EXE_NAME="$EXE_NAME-$2"
  LDFLAGS="$LDFLAGS -X 'main.Unidade=$2'"
fi

EXE_NAME="$EXE_NAME.exe"

GOOS=windows GOARCH=amd64 go build -ldflags "$LDFLAGS" -o "$EXE_NAME" main.go
echo "Build gerado: $EXE_NAME"
