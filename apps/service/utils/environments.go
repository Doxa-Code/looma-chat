package utils

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func CheckEnvironments(logger *Logger) {
	requiredEnvs := []string{"QUEUE_NAME", "DB_URL", "HASHES_PATH", "LOKI_URL", "WORKSPACE_ID"}
	for _, env := range requiredEnvs {
		if os.Getenv(env) == "" {
			msg := fmt.Sprintf("Variável de ambiente %s está ausente", env)
			logger.SendLog("fatal", msg)
			return
		}
	}
}

func LoadEnvironments() {
	if err := godotenv.Load(); err != nil {
		log.Println("Nenhum arquivo .env encontrado, usando variáveis do sistema")
	}
}
