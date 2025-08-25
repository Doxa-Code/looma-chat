//go:build windows
// +build windows

package carts

import (
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/debug"

	"looma-service/config"
	"looma-service/utils"
	"looma-service/utils/database"
	"looma-service/utils/formatter"
)

var logger *utils.Logger

var elog *debug.Log

func Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (bool, uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown
	changes <- svc.Status{State: svc.StartPending}
	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

	stopChan := make(chan struct{})
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.SendLog("fatal", fmt.Sprintf("Panic na goroutine principal: %v", r))
			}
		}()
		runMonitorLoopWithStop(stopChan)
	}()

loop:
	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				close(stopChan)
				break loop
			default:
				continue
			}
		}
	}

	changes <- svc.Status{State: svc.StopPending}
	return false, 0
}

func runMonitorLoopWithStop(stop <-chan struct{}) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			logger.SendLog("warning", "Parando o serviço conforme solicitado")
			return
		case <-ticker.C:
			logger.SendLog("info", "Iniciando o processo de checagem de mudanças")

			query := config.Env.Client.Queries.CartsWatcher

			columns, rows, err := database.Query(query, logger)
			if err != nil {
				log.Fatalf("Erro database query: %v", err)
			}

			hashes, hashesPath := utils.LoadHashes("carts-hashes.gob", logger)

			for rows.Next() {
				id, rowMap := database.CreateRowMap("id_pedido", columns, rows, logger)
				hash := utils.CreateHash(rowMap, logger)

				if oldHash, exists := hashes[id]; !exists || oldHash != hash {
					logger.SendLog("info", fmt.Sprintf("Mudança detectada para Id %s: %+v", id, rowMap))

					if exists {
						logger.SendLog("debug", fmt.Sprintf("Hash antigo: %s | Hash novo: %s", oldHash, hash))
					} else {
						logger.SendLog("debug", fmt.Sprintf("Nenhum hash antigo encontrado | Hash novo: %s", hash))
					}

					hashes[id] = hash
					utils.SaveHashes(hashesPath, hashes, logger)

					jsonPayload, err := formatter.BuildCartPayloadJSON(rowMap, config.Env.Client.WorkspaceId)
					logger.SendLog("debug", string(jsonPayload))
					if err != nil {
						logger.SendLog("error", fmt.Sprintf("Erro: %v", err))
					} else {
						utils.SendMessage(string(jsonPayload), "finishCart", logger, false)
					}
				}
			}
			logger.SendLog("info", "Finalizou loop de verificação de mudanças")
		}
	}
}

func StartWatcher(stop <-chan struct{}, isService bool) {
	logger = &utils.Logger{
		Lw: &utils.LokiWriter{
			Job: config.Env.Client.QueueName + "-carts-watcher"},
		IsService: isService}

	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	logger.SendLog("info", "Iniciando o Carts Watcher")

	var err error

	if isService {
		err = logger.SetupEventLog("Looma Service - Carts Watcher")
		if err != nil {
			logger.SendLog("error", fmt.Sprintf("Service failed: %v", err))
			return
		}
		defer logger.CloseEventLog()
	}

	runMonitorLoopWithStop(stop)
}
