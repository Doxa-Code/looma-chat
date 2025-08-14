package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"

	"looma-service/utils"
)

var DB *sql.DB

var logger *utils.Logger

func Connect(isService bool) error {
	logger = &utils.Logger{
		Lw: &utils.LokiWriter{
			Job: os.Getenv("QUEUE_NAME") + "-database"},
		IsService: isService}

	var err error
	DB, err = sql.Open("mysql", os.Getenv("DB_URL"))
	if err != nil {
		logger.SendLog("error", os.Getenv("DB_URL"))
		logger.SendLog("fatal", fmt.Sprintf("Erro ao conectar ao MySQL: %v", err))
		return err
	}

	if err := DB.Ping(); err != nil {
		logger.SendLog("fatal", fmt.Sprintf("Erro ao testar conexão com MySQL: %v", err))
		return err
	}

	logger.SendLog("info", "Conexão com banco estabelecida")
	return nil
}

func Close() {
	if DB != nil {
		if err := DB.Close(); err != nil {
			logger.SendLog("error", fmt.Sprintf("Erro ao fechar conexão MySQL: %v", err))
		} else {
			logger.SendLog("info", "Conexão com banco encerrada")
		}
	}
}

func Query(query string, logger *utils.Logger) ([]string, *sql.Rows, error) {
	rows, err := DB.Query(query)
	if err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao consultar a view: %v", err))
		return nil, nil, err
	}

	columns, err := rows.Columns()
	if err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao obter colunas: %v", err))
		rows.Close()
		return nil, nil, err
	}

	return columns, rows, nil
}

func CreateRowMap(colIdName string, columns []string, row *sql.Rows, logger *utils.Logger) (string, map[string]any) {
	id := ""
	rowMap := make(map[string]any)
	values := make([]any, len(columns))
	valuePtrs := make([]any, len(columns))

	for i := range values {
		valuePtrs[i] = &values[i]
	}
	if err := row.Scan(valuePtrs...); err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao escanear linha: %v", err))
		return id, rowMap
	}

	for i, col := range columns {
		val := values[i]
		if b, ok := val.([]byte); ok {
			rowMap[col] = string(b)
		} else {
			rowMap[col] = val
		}
		if col == colIdName {
			id = fmt.Sprintf("%v", rowMap[col])
		}
	}

	return id, rowMap
}

func RunProcedure(query string, params []interface{}) (sql.Result, error) {
	return DB.Exec(query, params...)
}
