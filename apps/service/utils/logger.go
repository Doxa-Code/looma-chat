//go:build windows
// +build windows

package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"golang.org/x/sys/windows/svc/eventlog"
)

type LokiWriter struct {
	Job   string
	Level string
}

func (w *LokiWriter) Write(level string, p []byte) (n int, err error) {
	data := append([]byte(nil), p...)
	go func(d []byte) {
		timestamp := fmt.Sprintf("%d", time.Now().UnixNano())
		payload := map[string]any{
			"streams": []map[string]any{
				{
					"stream": map[string]string{
						"job":   w.Job,
						"level": level,
					},
					"values": [][]string{
						{timestamp, string(d)},
					},
				},
			},
		}

		body, _ := json.Marshal(payload)
		resp, err := http.Post(os.Getenv("LOKI_URL"), "application/json", bytes.NewBuffer(body))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Erro enviando para Loki: %v\n", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != 204 {
			responseBody, _ := io.ReadAll(resp.Body)
			fmt.Fprintf(os.Stderr, "Loki respondeu %d: %s\n", resp.StatusCode, string(responseBody))
		}
	}(data)

	return len(p), nil
}

type Logger struct {
	Lw        *LokiWriter
	IsService bool
	elog      *eventlog.Log
}

func (l *Logger) SetupEventLog(name string) error {
	var err error
	l.elog, err = eventlog.Open(name)
	return err
}

func (l *Logger) CloseEventLog() {
	if l.elog != nil {
		l.elog.Close()
	}
}

func (l *Logger) SendLog(level string, message string) {
	if l.IsService && l.elog != nil {
		switch level {
		case "fatal", "error":
			l.elog.Error(1, message)
		case "warning", "warn":
			l.elog.Warning(1, message)
		}
	}
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	_, err := l.Lw.Write(level, []byte(fmt.Sprintf("[%s] [%s] %s", level, timestamp, message)))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro escrevendo no LokiWriter: %v\n", err)
	}
	log.Printf("[%s] %s", level, message)
	if level == "fatal" {
		time.Sleep(500 * time.Millisecond)
		os.Exit(1)
	}
}