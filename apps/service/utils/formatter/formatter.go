package formatter

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

func BuildProductPayloadJSON(product map[string]interface{}, workspaceId string) ([]byte, error) {
	payload := ProductPayload{
		WorkspaceId: workspaceId,
		Product: Product{
			ID:          fmt.Sprintf("%v", product["codigo"]),
			Description: fmt.Sprintf("%v", product["descricao"]),
			Manufactory: fmt.Sprintf("%v", product["marca"]),
		},
	}

	// Price
	if v2, ok := product["preco2"].(float64); ok && v2 != 0.0 {
		payload.Product.Price = int64(v2 * 100)
	} else if v, ok := product["preco"].(float64); ok && v != 0.0 {
		payload.Product.Price = int64(v * 100)
	} else {
		return nil, fmt.Errorf("campo 'price' inválido ou ausente para o id: %v", product["codigo"])
	}

	// Stock
	if v, ok := product["qtd_estoque_atual"].(float64); ok {
		payload.Product.Stock = int(v)
	} else if v, ok := product["qtd_estoque_atual"].(int64); ok {
		payload.Product.Stock = int(v)
	} else {
		return nil, fmt.Errorf("campo 'stock' inválido ou ausente")
	}

	// Nullable fields
	if v, ok := product["codigo_barra"].(string); ok && v != "" {
		payload.Product.Code = &v
	}
	if v, ok := product["vlr_promocao"].(int64); ok {
		val := int64(v * 100)
		payload.Product.PromotionPrice = &val
	}
	if v, ok := product["validade_promocao"].(time.Time); ok {
		payload.Product.PromotionEnd = &v
		now := time.Now()
		payload.Product.PromotionStart = &now
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("erro ao converter para JSON: %w", err)
	}

	return jsonBytes, nil
}

func BuildClientPayloadJSON(data map[string]interface{}, workspaceId string) ([]byte, error) {
	payload := ClientPayload{
		WorkspaceId: workspaceId,
		Client: Client{
			ID:        uuid.New().String(),
			PartnerID: fmt.Sprintf("%v", data["Cliente"]),
			Contact: Contact{
				Phone: fmt.Sprintf("%v", data["telefone"]),
				Name:  fmt.Sprintf("%v", data["nome"]),
			},
		},
	}

	if data["endereco"] != nil {
		address := Address{
			Street:       fmt.Sprintf("%v", data["endereco"]),
			Number:       fmt.Sprintf("%v", data["numero"]),
			Neighborhood: fmt.Sprintf("%v", data["bairro"]),
			City:         fmt.Sprintf("%v", data["cidade"]),
			State:        fmt.Sprintf("%v", data["estado"]),
			ZipCode:      fmt.Sprintf("%v", data["cep"]),
			Country:      "Brasil",
		}

		if note, ok := data["nome_convenio"].(string); ok && note != "" {
			address.Note = &note
		}

		payload.Client.Address = &address
	}

	return json.Marshal(payload)
}

func BuildCartPayloadJSON(data map[string]interface{}, workspaceId string) ([]byte, error) {
	var cartID string
	var status string = "pending" // valor padrão

	// --- ID do carrinho ---
	if val, ok := data["id_pedido"]; ok && val != nil && fmt.Sprintf("%v", val) != "" {
		cartID = fmt.Sprintf("%v", val)
	} else {
		return nil, fmt.Errorf("nenhum identificador de carrinho válido encontrado")
	}

	// --- Status ---
	switch {
	case isNotEmpty(data["status_cancelado"]):
		status = "canceled"
	case isNotEmpty(data["status_entrega"]):
		status = "delivered"
	case isNotEmpty(data["status_saiu_entrega"]):
		status = "on_the_way"
	case isNotEmpty(data["status_pronto_entrega"]):
		status = "ready_for_delivery"
	case isNotEmpty(data["status_separacao"]):
		status = "processing"
	case isNotEmpty(data["status_efetuado"]):
		status = "confirmed"
	}

	// --- Monta payload ---
	payload := CartPayload{
		WorkspaceId: workspaceId,
		CartID:      cartID,
		Status:      status,
	}

	// --- Converte para JSON ---
	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("erro ao converter cart payload para JSON: %w", err)
	}

	return jsonBytes, nil
}

// Função utilitária para checar se um valor é não-nulo e não-vazio
func isNotEmpty(value interface{}) bool {
	if value == nil {
		return false
	}
	str := fmt.Sprintf("%v", value)
	return str != ""
}
