//go:build windows
// +build windows

package products

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

			query := config.Env.Client.Queries.ProductWatcher

			columns, rows, err := database.Query(query, logger)

			if err != nil {
				logger.SendLog("error", fmt.Sprintf("Erro na Query: %v", err))
			}
			if rows == nil {
				logger.SendLog("warning", "Query retornou rows nil")
				continue
			}
			defer rows.Close()

			hashes, hashesPath := utils.LoadHashes("products-hashes.gob", logger)

			logger.SendLog("info", fmt.Sprintf("Número de colunas: %d", len(columns)))
			logger.SendLog("info", "Entrando no loop rows.Next()")

			// --- 1. Monta um slice com os itens da query ---
			type Item struct {
				ID     string
				RowMap map[string]interface{}
			}
			var items []Item

			for rows.Next() {
				id, rowMap := database.CreateRowMap("codigo", columns, rows, logger)
				if val, ok := rowMap["preco"]; !ok || val == nil {
					rowMap["preco"] = 0
				}
				items = append(items, Item{ID: id, RowMap: rowMap})
			}

			// --- 2. Ignora IDs duplicados e processa itens únicos.---
			unique := map[string]bool{}
			for _, item := range items {
				if unique[item.ID] {
					continue
				}
				unique[item.ID] = true

				hash := utils.CreateHash(item.RowMap, logger)

				if oldHash, exists := hashes[item.ID]; !exists || oldHash != hash {
					logger.SendLog("info", fmt.Sprintf("Mudança detectada para Id %s: %+v", item.ID, item.RowMap))

					if exists {
						logger.SendLog("debug", fmt.Sprintf("Hash antigo: %s | Hash novo: %s", oldHash, hash))
					} else {
						logger.SendLog("debug", fmt.Sprintf("Nenhum hash antigo encontrado | Hash novo: %s", hash))
					}

					hashes[item.ID] = hash
					utils.SaveHashes(hashesPath, hashes, logger)

					jsonPayload, err := formatter.BuildProductPayloadJSON(item.RowMap, config.Env.Client.WorkspaceId)
					if err != nil {
						logger.SendLog("error", fmt.Sprintf("Erro: %v", err))
					} else {
						utils.SendMessage(string(jsonPayload), "productsQueue", logger, true)
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
			Job: config.Env.Client.QueueName + "-products-watcher"},
		IsService: isService}

	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	logger.SendLog("info", "Iniciando o Products Watcher")

	var err error

	if isService {
		err = logger.SetupEventLog("Looma Service - Products Watcher")
		if err != nil {
			logger.SendLog("error", fmt.Sprintf("Service failed: %v", err))
			return
		}
		defer logger.CloseEventLog()
	}

	runMonitorLoopWithStop(stop)
}
