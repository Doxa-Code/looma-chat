package carts

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"

	"looma-service/config"
	"looma-service/utils"
	"looma-service/utils/database"
)

var cartLogger *utils.Logger

func mapCartToOrder(data interface{}) (Order, error) {
	var payload map[string]interface{}
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return Order{}, err
	}

	cart, ok := payload["cart"].(map[string]interface{})
	if !ok {
		return Order{}, fmt.Errorf("campo 'cart' não é map[string]interface{}")
	}

	address, ok := cart["address"].(map[string]interface{})
	if !ok {
		return Order{}, fmt.Errorf("campo 'address' não é map[string]interface{}")
	}

	client, ok := cart["client"].(map[string]interface{})
	if !ok {
		return Order{}, fmt.Errorf("campo 'client' não é map[string]interface{}")
	}

	contact, ok := client["contact"].(map[string]interface{})
	if !ok {
		return Order{}, fmt.Errorf("campo 'contact' não é map[string]interface{}")
	}

	// Função auxiliar para pegar string com segurança
	getString := func(m map[string]interface{}, key string) string {
		if v, ok := m[key]; ok && v != nil {
			if s, ok := v.(string); ok {
				return s
			}
		}
		return ""
	}

	// Função auxiliar para pegar float64 com segurança
	getFloat := func(m map[string]interface{}, key string) float64 {
		if v, ok := m[key]; ok && v != nil {
			switch val := v.(type) {
			case float64:
				return val
			case string:
				if num, err := strconv.ParseFloat(val, 64); err == nil {
					return num
				}
			}
		}
		return 0
	}

	return Order{
		IdPedido:              getString(cart, "id"),
		IdCliente:             getString(client, "id"),
		ClienteCPF:            "",
		ClienteNome:           getString(contact, "name"),
		ClienteEnderecoRua:    getString(address, "street"),
		ClienteEnderecoNumero: getString(address, "number"),
		ClienteEnderecoComp:   getString(address, "note"),
		ClienteEnderecoCidade: getString(address, "city"),
		ClienteEnderecoBairro: getString(address, "neighborhood"),
		ClienteEnderecoRef:    getString(address, "note"),
		ClienteEnderecoCEP:    getString(address, "zipCode"),
		ClienteEnderecoUF:     getString(address, "state"),
		ClienteTelefone:       getString(contact, "phone"),
		FormaEntrega:          "1",
		FormaPagamento:        getString(cart, "paymentMethod"),
		TrocoPara:             0,
		StatusEfetuado:        "",
		StatusProntoEntrega:   "",
		ValorProdutos:         getFloat(payload, "total"),
		ValorTaxaEntrega:      0,
		ValorTotal:            getFloat(payload, "total"),
	}, nil
}

func saveOrder(order Order) error {
	query := `CALL sp_inserir_atualizar_cabecalho_pedido(
		?,?,?,?,?,?,?,?,?,?,?,?,
			?,?,?,?,?,?,?,?,?,?
		);`

	params := []interface{}{
		order.IdPedido,
		order.IdCliente,
		order.ClienteCPF,
		order.ClienteNome,
		order.ClienteEnderecoRua,
		order.ClienteEnderecoNumero,
		order.ClienteEnderecoComp,
		order.ClienteEnderecoCidade,
		order.ClienteEnderecoBairro,
		order.ClienteEnderecoRef,
		order.ClienteEnderecoCEP,
		order.ClienteEnderecoUF,
		order.ClienteTelefone,
		order.FormaEntrega,
		order.FormaPagamento,
		order.TrocoPara,
		order.StatusEfetuado,
		order.StatusProntoEntrega,
		order.ValorProdutos,
		order.ValorTaxaEntrega,
		order.ValorTotal,
		"DOXACODE"}

	_, err := database.RunProcedure(query, params)
	return err
}

func processUpsertCart(data interface{}) error {
	order, err := mapCartToOrder(data)
	if err != nil {
		cartLogger.SendLog("error", fmt.Sprintf("Falha ao processar carrinho: %v", err))
		return err
	}

	bytes, _ := json.Marshal(order)
	log.Println(string(bytes))
	if err := saveOrder(order); err != nil {
		return fmt.Errorf("erro ao salvar pedido: %w", err)
	}

	cartLogger.SendLog("info", fmt.Sprintf("Pedido %s salvo com sucesso no banco", order.IdPedido))

	if err := processProductsFromCart(data, order.IdPedido); err != nil {
		return fmt.Errorf("erro ao processar produtos do carrinho: %w", err)
	}

	return nil
}

func processProductsFromCart(data interface{}, cartId string) error {
	var payload map[string]interface{}
	bytes, _ := json.Marshal(data)
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return err
	}

	cart, ok := payload["cart"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("campo 'cart' não é map[string]interface{}")
	}

	productsRaw, ok := cart["products"].([]interface{})
	if !ok {
		return fmt.Errorf("campo 'products' não encontrado ou inválido")
	}

	for _, p := range productsRaw {
		productMap, ok := p.(map[string]interface{})
		if !ok {
			cartLogger.SendLog("error", fmt.Sprintf("Produto inválido no carrinho: %+v", p))
			continue
		}

		payload := UpsertProductPayload{
			Id: cartId,
			CartProduct: Product{
				Id:          fmt.Sprintf("%v", productMap["id"]),
				Description: fmt.Sprintf("%v", productMap["description"]),
				Price:       productMap["price"].(float64),
				Quantity:    int(productMap["quantity"].(float64)), // se vier float
			},
		}

		if err := processUpsertProduct(payload); err != nil {
			log.Printf("Erro ao processar produto %s: %v", payload.CartProduct.Id, err)
		}
	}

	return nil
}

func upsertProduct(produto Product, cartId string) error {
	query := `CALL sp_inserir_atualizar_itens_pedido(
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

	if err := upsertProduct(product, cartId); err != nil {
		return fmt.Errorf("erro ao adicionar produto: %w", err)
	}

	cartLogger.SendLog("info", fmt.Sprintf("Produto atualizado para carrinho=%s: Id=%s, Nome=%s, Preço=%.2f, Quantidade=%d, Total=%.2f",
		cartId, product.Id, product.Description, product.Price, product.Quantity, float64(product.Price)*float64(product.Quantity)))
	return nil
}

func removeProduct(produtoId string, cartId string) error {
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

	cartId := payload.Cart.Id
	productId := payload.ProductId

	if err := removeProduct(productId, cartId); err != nil {
		return fmt.Errorf("erro ao remover produto: %w", err)
	}

	cartLogger.SendLog("info", fmt.Sprintf("Produto removido do carrinho=%s: Id=%s",
		cartId, productId))
	return nil
}

func cancelOrder(cartId string) error {
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

	if err := cancelOrder(cartId); err != nil {
		return fmt.Errorf("erro ao remover produto: %w", err)
	}

	cartLogger.SendLog("info", fmt.Sprintf("Pedido cancelado: Id=%s", cartId))
	return nil
}

func StartHandler(stop <-chan struct{}, isService bool) {
	cartLogger = &utils.Logger{
		Lw: &utils.LokiWriter{
			Job: config.Env.Client.QueueName + "-carts-handler"},
		IsService: isService}

	queueName := "cartQueue"

	cartLogger.SendLog("info", "Serviço iniciado. Aguardando mensagens SQS...")

	for {
		select {
		case <-stop:
			cartLogger.SendLog("warning", "Parando o serviço conforme solicitado")
			return
		default:

			rmessages, clientSQS, queueURL, ctx, err := utils.ReceiveMessage(queueName, cartLogger)

			if err != nil {
				cartLogger.SendLog("error", fmt.Sprintf("Erro ao receber mensagem: %v", err))
				continue
			}

			for _, message := range rmessages {
				var msg CartMessage
				if err := json.Unmarshal([]byte(*message.Body), &msg); err != nil {
					cartLogger.SendLog("error", fmt.Sprintf("Erro ao decodificar mensagem: %v", err))
					continue
				}

				if msg.WorkspaceId != config.Env.Client.WorkspaceId {
					cartLogger.SendLog("warn", "Mensagem ignorada, workspaceId diferente")
					continue
				}

				var errProcess error
				switch msg.Operation {
				case "orderCart":
					errProcess = processUpsertCart(msg.Data)
				case "upsertProduct":
					errProcess = processUpsertCart(msg.Data)
				case "removeProduct":
					errProcess = processRemoveProduct(msg.Data)
					if errProcess == nil {
						errProcess = processUpsertCart(msg.Data)
					}
				case "cancelCart":
					errProcess = processCancelCart(msg.Data)
				default:
					cartLogger.SendLog("warning", fmt.Sprintf("Operação desconhecida: %s", msg.Operation))
					errProcess = fmt.Errorf("operação inválida: %s", msg.Operation)
				}

				if errProcess != nil {
					cartLogger.SendLog("error", fmt.Sprintf("Erro ao processar mensagem: %v", errProcess))
					continue
				}

				utils.DeleteMessage(clientSQS, queueURL, ctx, message.ReceiptHandle, cartLogger)
			}
		}
	}
}
