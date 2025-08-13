# /bin/bash
go clean -cache
GOOS=windows GOARCH=amd64 go build -o builds/looma-service-$1.exe main.go