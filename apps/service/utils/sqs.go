package utils

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/google/uuid"
)

func createClient(queueName string, logger *Logger) (*sqs.Client, string, context.Context) {
	ctx := context.TODO()
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Erro carregando AWS config: %v", err)
	}

	if err != nil {
		logger.SendLog("fatal", fmt.Sprintf("Erro ao carregar configuração AWS: %v", err))
		return nil, "", nil
	}

	clientSQS := sqs.NewFromConfig(cfg)

	queueURLS := map[string]string{
		"productsQueue": "https://sqs.us-east-1.amazonaws.com/557130579131/looma-broker-production-ProductsBrokerQueue.fifo",
		"upsertCart":    "https://sqs.us-east-1.amazonaws.com/557130579131/looma-broker-production-UpsertCartQueue.fifo",
		"clientsQueue":  "https://sqs.us-east-1.amazonaws.com/557130579131/looma-broker-production-ClientsBrokerQueue.fifo",
		"finishCart":    "https://sqs.us-east-1.amazonaws.com/557130579131/looma-broker-production-FinishCartQueue.fifo",
	}

	return clientSQS, queueURLS[queueName], ctx
}

func SendMessage(payload string, queueName string, logger *Logger) {

	clientSQS, queueURL, ctx := createClient(queueName, logger)

	dedupID := uuid.New().String()

	sendResp, err := clientSQS.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:               &queueURL,
		MessageBody:            aws.String(payload),
		MessageGroupId:         aws.String("default"),
		MessageDeduplicationId: aws.String(dedupID),
	})

	if err != nil {
		logger.SendLog("fatal", fmt.Sprintf("Erro ao enviar mensagem: %v", err))
	}
	logger.SendLog("info", fmt.Sprintf("Mensagem enviada, ID: %v", string(*sendResp.MessageId)))
}

func ReceiveMessage(queueName string, logger *Logger) {

	clientSQS, queueURL, ctx := createClient(queueName, logger)

	recvResp, err := clientSQS.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            &queueURL,
		MaxNumberOfMessages: 5,
		WaitTimeSeconds:     10,
		VisibilityTimeout:   30,
	})

	if err != nil {
		logger.SendLog("fatal", fmt.Sprintf("Erro ao enviar mensagem: %v", err))
	}

	for _, msg := range recvResp.Messages {
		fmt.Println("Recebida:", *msg.Body)

		_, err := clientSQS.DeleteMessage(ctx, &sqs.DeleteMessageInput{
			QueueUrl:      &queueURL,
			ReceiptHandle: msg.ReceiptHandle,
		})

		if err != nil {
			log.Printf("Erro ao apagar mensagem: %v", err)
		}
	}
}
