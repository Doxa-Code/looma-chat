aws --profile loomaai sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/557130579131/loomabroker-fernandosouza-LoomaBrokerQueue.fifo \
  --message-body '{"id":"123","nome":"Cliente Teste","alteradoEm":"2025-08-11T18:00:00Z"}' \
  --message-group-id "teste" \
  --message-deduplication-id "$(uuidgen)"