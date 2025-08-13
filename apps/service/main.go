//go:build windows
// +build windows

package main

import (
	services "looma-service/services"
)

func main() {
	services.Run()
}
