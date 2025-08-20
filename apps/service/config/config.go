package config

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
)

type Queries struct {
	CartsWatcher   string `json:"cartsWatcher"`
	ClientsWatcher string `json:"clientsWatcher"`
	ProductWatcher string `json:"productWatcher"`
}

type ClientConfig struct {
	Queries       Queries `json:"queries"`
	CartsQueueUrl string  `json:"cartsQueueUrl"`
	WorkspaceId   string  `json:"workspaceId"`
	DbUrl         string  `json:"dbUrl"`
	QueueName     string  `json:"queueName"`
}

type Queues struct {
	FinishCart    string `json:"finishCart"`
	ProductsQueue string `json:"productsQueue"`
	ClientsQueue  string `json:"clientsQueue"`
}

type CommonConfig struct {
	AwsAccessKeyId     string `json:"awsAccessKeyId"`
	AwsSecretAccessKey string `json:"awsSecretAccessKey"`
	AwsRegion          string `json:"awsRegion"`
	HashesPath         string `json:"hashesPath"`
	LokiUrl            string `json:"lokiUrl"`
	CommonQueues       Queues `json:"queues"`
}

type Config struct {
	Common  CommonConfig
	Client  ClientConfig
	Cliente string
	Unidade string
}

var (
	mu      sync.RWMutex
	Current *Config
)

//go:embed clients/*.json
var clientFiles embed.FS

var Env = Get()

func Load(cliente, unidade string) error {
	if cliente == "" {
		return errors.New("cliente não informado")
	}

	// lê common.json
	commonData, err := clientFiles.ReadFile("clients/common.json")
	if err != nil {
		return fmt.Errorf("erro lendo common.json: %w", err)
	}
	var common CommonConfig
	if err := json.Unmarshal(commonData, &common); err != nil {
		return fmt.Errorf("erro parseando common.json: %w", err)
	}

	// lê o JSON do cliente
	data, err := clientFiles.ReadFile(fmt.Sprintf("clients/%s.json", cliente))
	if err != nil {
		return fmt.Errorf("erro lendo arquivo do cliente %s: %w", cliente, err)
	}

	// tenta decodificar como map de unidades
	var units map[string]ClientConfig
	if err := json.Unmarshal(data, &units); err == nil {
		var chosenUnit string
		var clientCfg ClientConfig

		if unidade != "" {
			cfg, ok := units[unidade]
			if !ok {
				return fmt.Errorf("unidade %s não encontrada no cliente %s", unidade, cliente)
			}
			chosenUnit = unidade
			clientCfg = cfg
		} else {
			// pega a primeira unidade disponível
			for u, cfg := range units {
				chosenUnit = u
				clientCfg = cfg
				break
			}
		}

		mu.Lock()
		Current = &Config{
			Common:  common,
			Client:  clientCfg,
			Cliente: cliente,
			Unidade: chosenUnit,
		}
		Env = *Current
		mu.Unlock()
		return nil
	}

	// se não for map de unidades, tenta JSON direto
	var clientCfg ClientConfig
	if err := json.Unmarshal(data, &clientCfg); err != nil {
		return fmt.Errorf("erro parseando JSON do cliente %s: %w", cliente, err)
	}

	mu.Lock()
	Current = &Config{
		Common:  common,
		Client:  clientCfg,
		Cliente: cliente,
		Unidade: "",
	}
	Env = *Current
	mu.Unlock()

	return nil
}

func Get() Config {
	mu.RLock()
	defer mu.RUnlock()
	if Current == nil {
		return Config{}
	}
	return *Current
}
