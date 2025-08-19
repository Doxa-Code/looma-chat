package utils

import (
	"crypto/sha256"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

func LoadHashes(filename string, logger *Logger) (map[string]string, string) {
	hashes := make(map[string]string)

	hashesDir := os.Getenv("HASHES_PATH")
	hashesPath := filepath.Join(hashesDir, filename)

	if hashesDir == "" {
		logger.SendLog("error", "Variável de ambiente HASHES_PATH não definida")
		return hashes, hashesPath
	}

	if _, err := os.Stat(hashesDir); os.IsNotExist(err) {
		if err := os.MkdirAll(hashesDir, 0755); err != nil {
			logger.SendLog("error", fmt.Sprintf("Erro ao criar diretório: %v", err))
			return hashes, hashesPath
		}
	}

	file, err := os.Open(hashesPath)
	if err != nil {
		SaveHashes(hashesPath, hashes, logger)
		return hashes, hashesPath
	}
	defer file.Close()

	decoder := gob.NewDecoder(file)

	if err := decoder.Decode(&hashes); err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao decodificar hashes do arquivo: %v", err))
		return hashes, hashesPath
	}

	return hashes, hashesPath
}

func SaveHashes(path string, hashes map[string]string, logger *Logger) {
	file, err := os.Create(path)
	if err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao criar arquivo de hashes: %v", err))
		return
	}
	defer file.Close()
	encoder := gob.NewEncoder(file)
	if err := encoder.Encode(hashes); err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao codificar hashes no arquivo: %v", err))
	}
}

func CreateHash(data map[string]any, logger *Logger) string {
	jsonData, err := json.Marshal(data)
	if err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao serializar linha: %v", err))
		return ""
	}
	hash := sha256.Sum256(jsonData)
	return fmt.Sprintf("%x", hash)
}
