package formatter

import "time"

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
	City         string  `json:"city"`
	Country      string  `json:"country"`
	Neighborhood string  `json:"neighborhood"`
	Note         *string `json:"note,omitempty"` // nullable
	Number       string  `json:"number"`
	State        string  `json:"state"`
	Street       string  `json:"street"`
	ZipCode      string  `json:"zipCode"`
}

type CartPayload struct {
	WorkspaceId string `json:"workspaceId"`
	CartID      string `json:"cartId"`
	Status      string `json:"status"`
}
