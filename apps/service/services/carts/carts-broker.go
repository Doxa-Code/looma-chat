package carts

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rabbitmq/amqp091-go"

	"looma-service/utils"
)

func mapCartToPedido(data interface{}) (Pedido, error) {
	var cart map[string]interface{}
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &cart); err != nil {
		return Pedido{}, err
	}

	address := cart["address"].(map[string]interface{})
	client := cart["client"].(map[string]interface{})
	contact := client["contact"].(map[string]interface{})

	return Pedido{
		IdPedido:              cart["id"].(string),
		IdCliente:             client["id"].(string),
		ClienteCPF:            "",
		ClienteNome:           contact["name"].(string),
		ClienteEnderecoRua:    address["street"].(string),
		ClienteEnderecoNumero: address["number"].(string),
		ClienteEnderecoComp:   address["note"].(string),
		ClienteEnderecoCidade: address["city"].(string),
		ClienteEnderecoBairro: address["neighborhood"].(string),
		ClienteEnderecoRef:    address["note"].(string),
		ClienteEnderecoCEP:    address["zipCode"].(string),
		ClienteEnderecoUF:     address["state"].(string),
		ClienteTelefone:       contact["phone"].(string),
		FormaEntrega:          "delivery",
		FormaPagamento:        cart["paymentMethod"].(string),
		TrocoPara:             0,
		StatusEfetuado:        "",
		StatusProntoEntrega:   "",
		ValorProdutos:         cart["total"].(float64),
		ValorTaxaEntrega:      0,
		ValorTotal:            cart["total"].(float64),
	}, nil
}

func salvarPedido(db *sql.DB, pedido Pedido) error {
	_, err := db.Exec(`
		CALL sp_inserir_cabecalho_pedido(
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
			$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
		)
	`,
		pedido.IdPedido,
		pedido.IdCliente,
		pedido.ClienteCPF,
		pedido.ClienteNome,
		pedido.ClienteEnderecoRua,
		pedido.ClienteEnderecoNumero,
		pedido.ClienteEnderecoComp,
		pedido.ClienteEnderecoCidade,
		pedido.ClienteEnderecoBairro,
		pedido.ClienteEnderecoRef,
		pedido.ClienteEnderecoCEP,
		pedido.ClienteEnderecoUF,
		pedido.ClienteTelefone,
		pedido.FormaEntrega,
		pedido.FormaPagamento,
		pedido.TrocoPara,
		pedido.StatusEfetuado,
		pedido.StatusProntoEntrega,
		pedido.ValorProdutos,
		pedido.ValorTaxaEntrega,
		pedido.ValorTotal,
		"DOXACODE")
	return err
}

func processOrderCart(data interface{}, db *sql.DB) error {
	pedido, err := mapCartToPedido(data)
	if err != nil {
		return fmt.Errorf("erro ao mapear pedido: %w", err)
	}

	if err := salvarPedido(db, pedido); err != nil {
		return fmt.Errorf("erro ao salvar pedido: %w", err)
	}

	log.Printf("Pedido %s salvo com sucesso no banco", pedido.IdPedido)
	return nil
}

func adicionarProduto(db *sql.DB, produto Product, cartId string) error {
	_, err := db.Exec(`
		CALL sp_inserir_itens_pedido(
			$1, $2, $3, $4, $5, $6
		);
	`,
		cartId,
		produto.Id,
		produto.Quantity,
		produto.Price,
		float64(produto.Quantity)*float64(produto.Price),
		"DOXACODE")
	return err
}

func processUpsertProduct(data interface{}, db *sql.DB) error {
	var payload UpsertProductPayload

	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("erro ao mapear payload: %w", err)
	}

	cartId := payload.Id
	product := payload.CartProduct

	adicionarProduto(db, product, cartId)

	if err := adicionarProduto(db, product, cartId); err != nil {
		return fmt.Errorf("erro ao adicionar produto: %w", err)
	}

	log.Printf("Produto atualizado para carrinho=%s: Id=%s, Nome=%s, Preço=%.2f, Quantidade=%d, Total=%.2f",
		cartId, product.Id, product.Description, product.Price, product.Quantity, float64(product.Price)*float64(product.Quantity))
	return nil
}

func removerProduto(db *sql.DB, produtoId string, cartId string) error {
	_, err := db.Exec(`
		CALL sp_deletar_item_pedido(
			$1, $2, $3
		);
	`,
		cartId,
		produtoId,
		"DOXACODE")
	return err
}

func processRemoveProduct(data interface{}, db *sql.DB) error {
	var payload RemoveProductPayload
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("erro ao mapear payload: %w", err)
	}

	cartId := payload.Id
	productId := payload.ProductId

	if err := removerProduto(db, productId, cartId); err != nil {
		return fmt.Errorf("erro ao remover produto: %w", err)
	}

	log.Printf("Produto removido do carrinho=%s: Id=%s",
		cartId, productId)
	return nil
}

func cancelarCarrinho(db *sql.DB, cartId string) error {
	_, err := db.Exec(`
		CALL sp_cancelar_pedido(
			$1, $2, $3
		);
	`,
		cartId,
		"Cliente desistiu do pedido",
		"DOXACODE")
	return err
}

func processCancelCart(data interface{}, db *sql.DB) error {
	var payload CancelCartPayload
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("erro ao mapear payload: %w", err)
	}

	cartId := payload.Id

	if err := cancelarCarrinho(db, cartId); err != nil {
		return fmt.Errorf("erro ao remover produto: %w", err)
	}

	log.Printf("Pedido cancelado: Id=%s",
		cartId)
	return nil
}

func StartBroker(stop <-chan struct{}) {
	if err := godotenv.Load(); err != nil {
		log.Println("Nenhum arquivo .env encontrado, usando variáveis do sistema")
	}

	logger := &utils.Logger{
		Lw: &utils.LokiWriter{
			Job: os.Getenv("QUEUE_NAME") + "-products-watcher"},
		IsService: false}

	rabbitURL := os.Getenv("RABBIT_URL")
	workspaceFilter := os.Getenv("WORKSPACE_ID")
	mainQueue := "looma-carts"
	retryQueue := "looma-carts-retry"
	exchange := "looma-exchange"

	dbURL := os.Getenv("DB_URL")
	db, err := sql.Open("mysql", dbURL)
	if err != nil {
		log.Fatalf("Erro ao conectar no banco: %v", err)
	}
	defer db.Close()

	conn, err := amqp091.Dial(rabbitURL)
	if err != nil {
		log.Fatalf("Erro ao conectar no RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Erro ao abrir canal: %v", err)
	}
	defer ch.Close()

	if err := ch.ExchangeDeclare(
		exchange,
		"direct",
		true,
		false,
		false,
		false,
		nil,
	); err != nil {
		log.Fatalf("Erro ao declarar exchange: %v", err)
	}

	// Declarar fila principal com DLX configurado para fila de retry
	_, err = ch.QueueDeclare(
		mainQueue,
		true,
		false,
		false,
		false,
		amqp091.Table{
			"x-dead-letter-exchange":    exchange,
			"x-dead-letter-routing-key": retryQueue,
		},
	)
	if err != nil {
		log.Fatalf("Erro ao declarar fila principal: %v", err)
	}

	// Bind fila principal na exchange
	if err := ch.QueueBind(mainQueue, mainQueue, exchange, false, nil); err != nil {
		log.Fatalf("Erro no bind da fila principal: %v", err)
	}

	// Declarar fila retry com TTL e DLX apontando para fila principal
	_, err = ch.QueueDeclare(
		retryQueue,
		true,
		false,
		false,
		false,
		amqp091.Table{
			"x-message-ttl":             int32(30000), // 30 segundos de espera na retry queue
			"x-dead-letter-exchange":    exchange,
			"x-dead-letter-routing-key": mainQueue,
		},
	)
	if err != nil {
		log.Fatalf("Erro ao declarar fila retry: %v", err)
	}

	// Bind fila retry na exchange
	if err := ch.QueueBind(retryQueue, retryQueue, exchange, false, nil); err != nil {
		log.Fatalf("Erro no bind da fila retry: %v", err)
	}

	msgs, err := ch.Consume(
		mainQueue,
		"",
		false, // autoAck false para controlar ack/nack manualmente
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Erro ao iniciar consumo: %v", err)
	}

	log.Printf("Serviço iniciado. Aguardando mensagens para workspaceId = %s ...", workspaceFilter)

	done := make(chan struct{})

	go func() {
		for {
			select {
			case payload, ok := <-msgs:
				if !ok {
					log.Println("Canal de mensagens fechado.")
					close(done)
					return
				}

				var msg CartMessage
				if err := json.Unmarshal(payload.Body, &msg); err != nil {
					log.Printf("Erro ao decodificar mensagem: %v", err)
					payload.Nack(false, false)
					continue
				}

				if msg.WorkspaceId == workspaceFilter {
					var cart Cart
					dataBytes, _ := json.Marshal(msg.Data)
					if err := json.Unmarshal(dataBytes, &cart); err != nil {
						log.Printf("Erro ao decodificar carrinho: %v", err)
						payload.Nack(false, false)
						continue
					}

					log.Printf("Carrinho: %s, Operation: %s", cart.Id, msg.Operation)

					var errProcess error
					switch msg.Operation {
					case "orderCart":
						errProcess = processOrderCart(msg.Data, db)
					case "upsertProduct":
						errProcess = processUpsertProduct(msg.Data, db)
					case "removeProduct":
						errProcess = processRemoveProduct(msg.Data, db)
					case "cancelCart":
						errProcess = processCancelCart(msg.Data, db)
					default:
						log.Printf("Operação desconhecida recebida: %s", msg.Operation)
						errProcess = fmt.Errorf("operação inválida: %s", msg.Operation)
					}

					if errProcess != nil {
						log.Printf("Erro no processamento da operação %s: %v", msg.Operation, errProcess)
						payload.Nack(false, false)
						continue
					}

					payload.Ack(false)
				} else {
					log.Printf("Mensagem ignorada (workspaceId diferente): %s", msg.WorkspaceId)
				}

			case <-stop:
				logger.SendLog("warning", "Parando o serviço conforme solicitado")
				close(done)
				return
			}
		}
	}()
	<-done
}
