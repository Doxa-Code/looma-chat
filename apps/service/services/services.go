//go:build windows
// +build windows

package services

import (
	"log"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/debug"

	"looma-service/services/carts"
	"looma-service/utils/database"
)

type loomaService struct {
	stopChan  chan struct{}
	isService bool
}

func (service *loomaService) Execute(args []string, req <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown
	status <- svc.Status{State: svc.StartPending}

	service.stopChan = make(chan struct{})

	log.Printf("Looma Service iniciado!")

	// go clients.StartWatcher(service.stopChan, service.isService)
	// go products.StartWatcher(service.stopChan, service.isService)
	// go carts.StartWatcher(service.stopChan, service.isService)
	go carts.StartBroker(service.stopChan)

	status <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

loop:
	for c := range req {
		switch c.Cmd {
		case svc.Interrogate:
			status <- c.CurrentStatus
		case svc.Stop, svc.Shutdown:
			close(service.stopChan)
			database.Close()
			break loop
		default:
			log.Printf("Comando não suportado: %v", c)
		}
	}

	status <- svc.Status{State: svc.StopPending}
	return false, 0
}

func Run() {
	name := "Looma Service"

	isService, err := svc.IsWindowsService()

	if err := database.Connect(isService); err != nil {
		log.Fatalf("Erro ao inicializar banco: %v", err)
	}

	if isService {
		err = svc.Run(name, &loomaService{make(chan struct{}), true})
	} else {
		err = debug.Run(name, &loomaService{make(chan struct{}), false})
	}
	if err != nil {
		log.Fatalf("Erro ao executar serviço: %v", err)
	}
}
