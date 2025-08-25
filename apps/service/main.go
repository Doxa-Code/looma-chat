//go:build windows
// +build windows

package main

import (
	services "looma-service/services"
)

var (
	Cliente string
	Unidade string
)

func main() {
	services.Run(Cliente, Unidade)
}
