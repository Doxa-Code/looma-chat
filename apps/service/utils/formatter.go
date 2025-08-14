package utils

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ProductPayload struct {
	WorkspaceId string  `json:"workspaceId"`
	Product     Product `json:"product"`
}

type Product struct {
	ID             string     `json:"id"`
	Description    string     `json:"description"`
	Code           *string    `json:"code"` // nullable => ponteiro
	Manufactory    string     `json:"manufactory"`
	Price          int64      `json:"price"`
	Stock          int        `json:"stock"`
	PromotionPrice *int64     `json:"promotionPrice"`
	PromotionStart *time.Time `json:"promotionStart"`
	PromotionEnd   *time.Time `json:"promotionEnd"`
}

type ClientPayload struct {
	WorkspaceId string `json:"workspaceId"`
	Client      Client `json:"client"`
}

type Client struct {
	ID        string   `json:"id"`
	PartnerID string   `json:"partnerId"`
	Contact   Contact  `json:"contact"`
	Address   *Address `json:"address,omitempty"`
}

type Contact struct {
	Phone string `json:"phone"`
	Name  string `json:"name"`
}

type Address struct {
	Street       string  `json:"street"`
	Number       string  `json:"number"`
	Neighborhood string  `json:"neighborhood"`
	City         string  `json:"city"`
	State        string  `json:"state"`
	ZipCode      string  `json:"zipCode"`
	Country      string  `json:"country"`
	Note         *string `json:"note,omitempty"` // nullable
}

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
	if v2, ok := product["preco2"].(int64); ok && v2 != 0.0 {
		payload.Product.Price = v2
	} else if v, ok := product["preco"].(int64); ok && v != 0.0 {
		payload.Product.Price = v
	} else {
		return nil, fmt.Errorf("campo 'price' inválido ou ausente")
	}

	// Stock
	if v, ok := product["qtd_estoque_atual"].(int64); ok {
		payload.Product.Stock = int(v)
	} else if v, ok := product["qtd_estoque_atual"].(int); ok {
		payload.Product.Stock = int(v)
	} else {
		return nil, fmt.Errorf("campo 'stock' inválido ou ausente")
	}

	// Nullable fields
	if v, ok := product["codigo_barra"].(string); ok && v != "" {
		payload.Product.Code = &v
	}
	if v, ok := product["vlr_promocao"].(int64); ok {
		payload.Product.PromotionPrice = &v
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
