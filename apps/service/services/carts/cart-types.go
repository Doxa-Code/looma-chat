package carts

type Order struct {
	IdPedido              string  `json:"id_pedido"`
	IdCliente             string  `json:"id_cliente"`
	ClienteCPF            string  `json:"cliente_cpf"`
	ClienteNome           string  `json:"cliente_nome"`
	ClienteEnderecoRua    string  `json:"cliente_endereco_logradouro"`
	ClienteEnderecoNumero string  `json:"cliente_endereco_numero"`
	ClienteEnderecoComp   string  `json:"cliente_endereco_complemento"`
	ClienteEnderecoCidade string  `json:"cliente_endereco_cidade"`
	ClienteEnderecoBairro string  `json:"cliente_endereco_bairro"`
	ClienteEnderecoRef    string  `json:"cliente_endereco_referencia"`
	ClienteEnderecoCEP    string  `json:"cliente_endereco_cep"`
	ClienteEnderecoUF     string  `json:"cliente_endereco_uf"`
	ClienteTelefone       string  `json:"cliente_telefone"`
	FormaEntrega          string  `json:"forma_entrega"`
	FormaPagamento        string  `json:"forma_pagamento"`
	TrocoPara             float64 `json:"troco_para"`
	StatusEfetuado        string  `json:"status_efetuado"`
	StatusProntoEntrega   string  `json:"status_pronto_entrega"`
	ValorProdutos         float64 `json:"valor_produtos"`
	ValorTaxaEntrega      float64 `json:"valor_taxa_entrega"`
	ValorTotal            float64 `json:"valor_total"`
}
type CartMessage struct {
	WorkspaceId string      `json:"workspaceId"`
	Operation   string      `json:"operation"`
	Data        interface{} `json:"data"`
}

type Address struct {
	City         string `json:"city"`
	Country      string `json:"country"`
	Id           string `json:"id"`
	Neighborhood string `json:"neighborhood"`
	Note         string `json:"note"`
	Number       string `json:"number"`
	State        string `json:"state"`
	Street       string `json:"street"`
	ZipCode      string `json:"zipCode"`
}

type Contact struct {
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Thumbnail string `json:"thumbnail"`
}

type Client struct {
	Address Address `json:"address"`
	Contact Contact `json:"contact"`
	Id      string  `json:"id"`
}

type Product struct {
	Description string  `json:"description"`
	Id          string  `json:"id"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
}

type CancelCartPayload struct {
	Id string `json:"id"`
}

type RemoveProductPayload struct {
	Cart      Cart    `json:"cart"`
	Total     float64 `json:"total"`
	ProductId string  `json:"productId"`
}

type UpsertProductPayload struct {
	Id          string  `json:"id"`
	CartProduct Product `json:"cartProduct"`
}

type Cart struct {
	Id            string            `json:"id"`
	WorkspaceId   string            `json:"workspaceId"`
	Address       Address           `json:"address"`
	Attendant     map[string]string `json:"attendant"`
	Client        Client            `json:"client"`
	Status        string            `json:"status"`
	CanceledAt    *string           `json:"canceledAt"`
	FinishedAt    *string           `json:"finishedAt"`
	ExpiredAt     *string           `json:"expiredAt"`
	OrderedAt     string            `json:"orderedAt"`
	PaymentMethod string            `json:"paymentMethod"`
	Products      []Product         `json:"products"`
	Total         float64           `json:"total"`
}
