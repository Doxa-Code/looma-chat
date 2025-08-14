package carts

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"

	"looma-service/utils"
	"looma-service/utils/database"
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

func salvarPedido(pedido Pedido) error {
	query := `CALL sp_inserir_cabecalho_pedido(
		?,?,?,?,?,?,?,?,?,?,?,?,
			?,?,?,?,?,?,?,?,?,?
		);`

	params := []interface{}{
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
		"DOXACODE"}

	_, err := database.RunProcedure(query, params)
	return err
}

func processOrderCart(data interface{}) error {
	pedido, err := mapCartToPedido(data)
	if err != nil {
		return fmt.Errorf("erro ao mapear pedido: %w", err)
	}

	if err := salvarPedido(pedido); err != nil {
		return fmt.Errorf("erro ao salvar pedido: %w", err)
	}

	log.Printf("Pedido %s salvo com sucesso no banco", pedido.IdPedido)
	return nil
}

func adicionarProduto(produto Product, cartId string) error {
	query := `CALL sp_inserir_itens_pedido(
			?, ?, ?, ?, ?, ?
		);`
	params := []interface{}{
		cartId,
		produto.Id,
		produto.Quantity,
		produto.Price,
		float64(produto.Quantity) * float64(produto.Price),
		"DOXACODE",
	}
	_, err := database.RunProcedure(query, params)
	return err
}

func processUpsertProduct(data interface{}) error {
	var payload UpsertProductPayload

	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("erro ao mapear payload: %w", err)
	}

	cartId := payload.Id
	product := payload.CartProduct

	adicionarProduto(product, cartId)

	if err := adicionarProduto(product, cartId); err != nil {
		return fmt.Errorf("erro ao adicionar produto: %w", err)
	}

	log.Printf("Produto atualizado para carrinho=%s: Id=%s, Nome=%s, Preço=%.2f, Quantidade=%d, Total=%.2f",
		cartId, product.Id, product.Description, product.Price, product.Quantity, float64(product.Price)*float64(product.Quantity))
	return nil
}

func removerProduto(produtoId string, cartId string) error {
	query := `CALL sp_deletar_item_pedido(
			?, ?, ?
		);`
	params := []interface{}{
		cartId,
		produtoId,
		"DOXACODE",
	}
	_, err := database.RunProcedure(query, params)
	return err
}

func processRemoveProduct(data interface{}) error {
	var payload RemoveProductPayload
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("erro ao mapear payload: %w", err)
	}

	cartId := payload.Id
	productId := payload.ProductId

	if err := removerProduto(productId, cartId); err != nil {
		return fmt.Errorf("erro ao remover produto: %w", err)
	}

	log.Printf("Produto removido do carrinho=%s: Id=%s",
		cartId, productId)
	return nil
}

func cancelarCarrinho(cartId string) error {
	query := `CALL sp_cancelar_pedido(
			?, ?, ?
		);`
	params := []interface{}{
		cartId,
		"Cliente desistiu do pedido",
		"DOXACODE",
	}
	_, err := database.RunProcedure(query, params)
	return err
}

func processCancelCart(data interface{}) error {
	var payload CancelCartPayload
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("erro ao mapear payload: %w", err)
	}

	cartId := payload.Id

	if err := cancelarCarrinho(cartId); err != nil {
		return fmt.Errorf("erro ao remover produto: %w", err)
	}

	log.Printf("Pedido cancelado: Id=%s",
		cartId)
	return nil
}

func StartBroker(stop <-chan struct{}) {
	logger := &utils.Logger{
		Lw: &utils.LokiWriter{
			Job: os.Getenv("QUEUE_NAME") + "-products-watcher"},
		IsService: false}

	queueName := "upsertCart"

	logger.SendLog("info", "Serviço iniciado. Aguardando mensagens SQS...")

	for {
		select {
		case <-stop:
			logger.SendLog("warning", "Parando o serviço conforme solicitado")
			return
		default:

			rmessages, clientSQS, queueURL, ctx, err := utils.ReceiveMessage(queueName, logger)

			if err != nil {
				logger.SendLog("error", fmt.Sprintf("Erro ao receber mensagem: %v", err))
				continue
			}

			for _, message := range rmessages {
				var msg CartMessage
				if err := json.Unmarshal([]byte(*message.Body), &msg); err != nil {
					logger.SendLog("error", fmt.Sprintf("Erro ao decodificar mensagem: %v", err))
					continue
				}

				var errProcess error
				switch msg.Operation {
				case "orderCart":
					errProcess = processOrderCart(msg.Data)
				case "upsertProduct":
					errProcess = processUpsertProduct(msg.Data)
				case "removeProduct":
					errProcess = processRemoveProduct(msg.Data)
				case "cancelCart":
					errProcess = processCancelCart(msg.Data)
				default:
					logger.SendLog("warning", fmt.Sprintf("Operação desconhecida: %s", msg.Operation))
					errProcess = fmt.Errorf("operação inválida: %s", msg.Operation)
				}

				if errProcess != nil {
					logger.SendLog("error", fmt.Sprintf("Erro ao processar mensagem: %v", errProcess))
				}

				utils.DeleteMessage(clientSQS, queueURL, ctx, message.ReceiptHandle, logger)
			}
		}
	}
}
