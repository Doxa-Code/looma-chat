aws --profile loomaai sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/557130579131/looma-broker-production-LoomaBrokerQueue.fifo \
  --message-body '{"workspaceId":"123", "product": { "id": "1", "description": "Produto", "code": null, "manufactory": "Manufactory", "price": 1, "stock": 2, "promotionPrice": null, "promotionStart": null, "promotionEnd": null } }' \
  --message-group-id "321" \
  --message-deduplication-id "$(uuidgen)"