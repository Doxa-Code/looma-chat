package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"

	"looma-service/utils"
)

func Query(query string, logger *utils.Logger) ([]string, *sql.Rows, error) {
	db, err := sql.Open("mysql", os.Getenv("DB_URL"))
	if err != nil {
		logger.SendLog("fatal", fmt.Sprintf("Erro MySQL: %v", err))
		return nil, nil, err
	}

	rows, err := db.Query(query)
	if err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao consultar a view: %v", err))
		return nil, nil, err
	}

	columns, err := rows.Columns()
	if err != nil {
		logger.SendLog("error", fmt.Sprintf("Erro ao obter colunas: %v", err))
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
