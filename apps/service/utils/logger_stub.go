//go:build !windows
// +build !windows

package utils

type Logger struct {
	Lw        *LokiWriter
	IsService bool
}

type LokiWriter struct {
	Job   string
	Level string
}

func (l *Logger) SetupEventLog(name string) error      { return nil }
func (l *Logger) CloseEventLog()                       {}
func (l *Logger) SendLog(level string, message string) {}
