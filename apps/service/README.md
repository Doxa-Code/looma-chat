# Looma Service

Serviço desenvolvido em **Go** para rodar como um **serviço do Windows**, responsável por integrar os dados do sistema do cliente com os serviços da Looma.

O executável é personalizado por cliente e unidade no momento da build.

---

## Serviços Embutidos

O serviço possui os seguintes watchers e handlers:

### Products Watcher

- Monitora o banco de dados do cliente, lendo a tabela/view de produtos disponibilizada.
- Gera um arquivo `products-hashes.gob` que é usado para verificar se houve mudanças em alguma linha a cada execução.
- Linhas com mudança são enviadas para uma fila **SQS**.

### Clients Watcher

- Monitora o banco de dados do cliente, lendo a tabela/view de clientes disponibilizada.
- Gera um arquivo `clients-hashes.gob` que é usado para verificar se houve mudanças em alguma linha a cada execução.
- Linhas com mudança são enviadas para uma fila **SQS**.

### Carts Watcher

- Monitora o banco de dados do cliente, lendo a tabela/view de carrinhos/pedidos disponibilizada.
- Gera um arquivo `carts-hashes.gob` que é usado para verificar se houve mudanças em alguma linha a cada execução.
- Linhas com mudança são enviadas para uma fila **SQS**.

### Carts Handler

- Lê uma fila **SQS** onde são recebidos novos pedidos.
- Processa e insere esses pedidos no banco de dados do cliente através de uma **procedure**.

---

## Estrutura de Configuração

- A pasta `config/clients` contém arquivos de configuração para cada cliente (`nome-cliente.json`) e um arquivo de configurações comuns entre os clientes (`common.json`).
- Cada build do executável utiliza as configurações correspondentes ao cliente e unidade informados.

Exemplo de arquivos de configuração:

**Arquivo common.json**

```json
{
  "awsAccessKeyId": "Access key id da AWS",
  "awsSecretAccessKey": "Secret access key da AWS",
  "awsRegion": "Região da AWS",
  "hashesPath": "Caminho da pasta da Looma, normalmente 'C:/looma'",
  "lokiUrl": "URL do Loki(serviço de logs)",
  "queues": {
    "finishCart": "URL da fila de carrinhos",
    "productsQueue": "URL da fila de produtos",
    "clientsQueue": "URL da fila de clientes"
  }
}
```

**Arquivo do cliente**

```json
{
  "unidade1": {
    "queries": {
      "cartsWatcher": "Query para buscar os carrinhos no banco do cliente",
      "clientsWatcher": "Query para buscar os clientes no banco do cliente",
      "productWatcher": "Query para buscar os produtos no banco do cliente"
    },
    "cartsQueueUrl": "URL da fila de pedidos/carrinhos do cliente",
    "workspaceId": "Id do workspace da unidade",
    "dbUrl": "URL de conexão com o banco",
    "queueName": "Nome usado nas filas/logger, no padrão nome-cliente-nome-unidade"
  },
  "unidade2": {
    "queries": {
      "cartsWatcher": "Query para buscar os carrinhos no banco do cliente",
      "clientsWatcher": "Query para buscar os clientes no banco do cliente",
      "productWatcher": "Query para buscar os produtos no banco do cliente"
    },
    "cartsQueueUrl": "URL da fila de pedidos/carrinhos do cliente",
    "workspaceId": "Id do workspace da unidade",
    "dbUrl": "URL de conexão com o banco",
    "queueName": "Nome usado nas filas/logger, no padrão nome-do-cliente-nome-da-unidade"
  },
  .
  .
  .
}

```

O arquivo de clientes pode possuir apenas uma unidade, nesse caso, o json não tem uma chave com o nome da unidade:

```json
{
  "queries": {
    "cartsWatcher": "Query para buscar os carrinhos no banco do cliente",
    "clientsWatcher": "Query para buscar os clientes no banco do cliente",
    "productWatcher": "Query para buscar os produtos no banco do cliente"
  },
  "cartsQueueUrl": "URL da fila de pedidos/carrinhos do cliente",
  "workspaceId": "Id do workspace da unidade",
  "dbUrl": "URL de conexão com o banco",
  "queueName": "Nome usado nas filas/logger, no padrão nome-cliente-nome-unidade"
}
```

---

## Filas

### Fila de Clientes

- **Descrição:** Recebe os dados de clientes do servidor, utilizados para consultar informações de desconto.
- **Escopo:** Fila comum entre os clientes.
- **Fluxo:** `Looma Service (Servidor)` → `Fila` → `Looma Chat`

#### Estrutura do payload

| Campo                         | Tipo             | Descrição                                        |
| ----------------------------- | ---------------- | ------------------------------------------------ |
| `workspaceId`                 | `string`         | ID do workspace                                  |
| `client.id`                   | `string`         | UUID gerado automaticamente                      |
| `client.partnerId`            | `string`         | ID do cliente no sistema parceiro                |
| `client.contact.phone`        | `string`         | Telefone do cliente                              |
| `client.contact.name`         | `string`         | Nome do cliente                                  |
| `client.address.street`       | `string`         | Rua do endereço                                  |
| `client.address.number`       | `string`         | Número do endereço                               |
| `client.address.neighborhood` | `string`         | Bairro                                           |
| `client.address.city`         | `string`         | Cidade                                           |
| `client.address.state`        | `string`         | Sigla do estado (Ex: SP)                         |
| `client.address.zipCode`      | `string`         | CEP                                              |
| `client.address.country`      | `string`         | País (fixo como "Brasil")                        |
| `client.address.note`         | `string \| null` | Observação ou complemento do endereço (opcional) |

#### Exemplo de mensagem

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "client": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "partnerId": "C12345",
    "contact": {
      "phone": "+5511999998888",
      "name": "Lucas Guerreiro"
    },
    "address": {
      "street": "Rua Exemplo",
      "number": "123",
      "neighborhood": "Bairro Central",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01000-000",
      "country": "Brasil",
      "note": "Casa dos fundos"
    }
  }
}
```

### Fila de Produtos

- **Descrição:** Recebe todos os produtos da base do cliente, mantendo a Looma atualizada com estoque e preço atual.
- **Escopo:** Fila comum entre os clientes.
- **Fluxo:** `Looma Service (Servidor)` → `Fila` → `Looma Chat`

#### Estrutura do payload

| Campo                    | Tipo             | Descrição                                             |
| ------------------------ | ---------------- | ----------------------------------------------------- |
| `workspaceId`            | `string`         | ID do workspace                                       |
| `product.id`             | `string`         | Código interno do produto                             |
| `product.description`    | `string`         | Descrição do produto                                  |
| `product.code`           | `string \| null` | Código de barras do produto (opcional)                |
| `product.manufactory`    | `string`         | Fabricante ou marca do produto                        |
| `product.price`          | `int`            | Preço em centavos (ex: `5999` = R$59,99)              |
| `product.stock`          | `int`            | Quantidade em estoque                                 |
| `product.promotionPrice` | `int \| null`    | Preço promocional em centavos (opcional)              |
| `product.promotionStart` | `string \| null` | Data/hora de início da promoção em ISO8601 (opcional) |
| `product.promotionEnd`   | `string \| null` | Data/hora de fim da promoção em ISO8601 (opcional)    |

#### Exemplo de mensagem

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "product": {
    "id": "P12345",
    "description": "Nome do remédio",
    "code": "7891234567890",
    "manufactory": "MarcaX",
    "price": 5999,
    "stock": 120,
    "promotionPrice": 4999,
    "promotionStart": "2025-08-21T11:00:00Z",
    "promotionEnd": "2025-09-01T00:00:00Z"
  }
}
```

### Fila de Carrinhos (Watcher)

- **Descrição:** Recebe atualizações de carrinhos vindas da base do cliente, permitindo acompanhar o status do carrinho e iniciar o pós-venda quando a venda for finalizada no sistema.
- **Escopo:** Fila comum entre os clientes.
- **Fluxo:** Looma Service no servidor -> Fila -> Looma Chat

#### Estrutura do payload

| Campo         | Tipo     | Descrição                                                         |
| ------------- | -------- | ----------------------------------------------------------------- |
| `workspaceId` | `string` | ID do workspace                                                   |
| `cartId`      | `string` | UUID do carrinho ou pedido                                        |
| `status`      | `string` | Status atual do carrinho. Os valores dependem do banco do cliente |

#### Exemplo de mensagem

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "cartId": "0a398933-536f-498b-ba48-90bf469c4de7",
  "status": "processing"
}
```

### Fila de Carrinhos (Handler)

- **Descrição:** Recebe os carrinhos gerados pela Looma para serem inseridos no sistema do cliente.
- **Escopo:** Fila única por cliente.
- **Fluxo:** Looma Chat -> Fila -> Looma Service no servidor do cliente
- **Operações Disponíveis:**
  - `orderCart` – Envia para o sistema do cliente para criar um pedido.
  - `upsertProduct` – Adiciona ou atualiza um produto do carrinho no sistema do cliente.
  - `removeProduct` – Remove um produto do carrinho no sistema do cliente.
  - `cancelCart` – Cancela o carrinho no sistema do cliente.

#### Estrutura base do objeto `cart`

| Campo                      | Tipo             | Descrição                                                                                       |
| -------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `id`                       | `string`         | UUID do carrinho/pedido.                                                                        |
| `client.id`                | `string`         | UUID do cliente.                                                                                |
| `client.contact.name`      | `string`         | Nome do cliente.                                                                                |
| `client.contact.phone`     | `string`         | Telefone do cliente.                                                                            |
| `client.contact.thumbnail` | `string`         | URL da imagem do cliente (opcional).                                                            |
| `client.address`           | `object`         | Endereço principal do cliente ([ver estrutura do endereço](#estrutura-base-do-objeto-address)). |
| `attendant.id`             | `string`         | UUID do atendente associado ao pedido.                                                          |
| `attendant.name`           | `string`         | Nome do atendente.                                                                              |
| `products[]`               | `array`          | Lista de produtos no carrinho.                                                                  |
| `products[].id`            | `string`         | ID interno do produto.                                                                          |
| `products[].description`   | `string`         | Descrição do produto.                                                                           |
| `products[].price`         | `number`         | Preço unitário do produto.                                                                      |
| `products[].realPrice`     | `number`         | Preço unitário original (sem desconto).                                                         |
| `products[].quantity`      | `number`         | Quantidade do produto no carrinho.                                                              |
| `address`                  | `object`         | Endereço de entrega do pedido ([ver estrutura do endereço](#estrutura-base-do-objeto-address)). |
| `status`                   | `string`         | Status atual do carrinho, ex.: `"order"`.                                                       |
| `createdAt`                | `string`         | Data/hora de criação do carrinho (ISO8601).                                                     |
| `orderedAt`                | `string`         | Data/hora de finalização ou atualização do carrinho (ISO8601).                                  |
| `expiredAt`                | `string \| null` | Data de expiração do pedido (se aplicável).                                                     |
| `finishedAt`               | `string \| null` | Data de conclusão do pedido (se aplicável).                                                     |
| `canceledAt`               | `string \| null` | Data de cancelamento (se aplicável).                                                            |
| `paymentMethod`            | `string`         | Método de pagamento (ex.: `"CREDIT_CARD"`).                                                     |
| `paymentChange`            | `number \| null` | Troco solicitado (se pagamento em dinheiro).                                                    |
| `cancelReason`             | `string \| null` | Motivo do cancelamento (quando aplicável).                                                      |

#### Estrutura base do objeto `address`

| Campo                  | Tipo             | Descrição                                         |
| ---------------------- | ---------------- | ------------------------------------------------- |
| `address.id`           | `string`         | UUID do endereço.                                 |
| `address.street`       | `string`         | Rua do endereço.                                  |
| `address.number`       | `string`         | Número do endereço.                               |
| `address.neighborhood` | `string`         | Bairro.                                           |
| `address.city`         | `string`         | Cidade.                                           |
| `address.state`        | `string`         | Sigla do estado (Ex: SP).                         |
| `address.zipCode`      | `string`         | CEP.                                              |
| `address.country`      | `string`         | País (fixo como "Brasil").                        |
| `address.note`         | `string \| null` | Observação ou complemento do endereço (opcional). |

#### Exemplo do objeto `cart`

```json
{
  "id": "85fe98s6-0rgs-43h4-85bb-761573482156",
  "client": {
    "id": "db4ddacb-4315-4f87-aa66-9fc616504a7b",
    "contact": {
      "name": "Doxa Code",
      "phone": "5519920016741",
      "thumbnail": ""
    },
    "address": {
      "id": "c2d27d7a-1c04-451b-b7f9-548f2faf3bd3",
      "street": "Rua Marquês de Três Rios",
      "number": "",
      "neighborhood": "Centro",
      "city": "Campinas",
      "state": "SP",
      "zipCode": "13013177",
      "country": "Brasil",
      "note": ""
    }
  },
  "attendant": {
    "id": "a3ebb0e0-7652-49c2-8734-cc3078905e24",
    "name": "Looma AI"
  },
  "products": [
    {
      "id": "17678",
      "description": "DIPIRONA 1G MONO C/8 CP PRATI",
      "price": 13.31,
      "realPrice": 13.31,
      "quantity": 1
    },
    {
      "id": "4700021",
      "description": "HIRUDOID 500 POMADA 40G",
      "price": 46.41,
      "realPrice": 46.41,
      "quantity": 1
    }
  ],
  "address": {
    "id": "b1bc714d-8f79-46a6-869d-f8c1d00f3c6e",
    "street": "Rua Marquês de Três Rios",
    "number": "242",
    "neighborhood": "Centro",
    "city": "Campinas",
    "state": "SP",
    "zipCode": "13013177",
    "country": "",
    "note": ""
  },
  "status": "order",
  "createdAt": "2025-08-15T17:54:34.000Z",
  "orderedAt": "2025-08-15T18:07:22.090Z",
  "expiredAt": null,
  "finishedAt": null,
  "canceledAt": null,
  "paymentMethod": "CREDIT_CARD",
  "paymentChange": null,
  "cancelReason": null
}
```

---

#### Estrutura do payload – `orderCart`

| Campo         | Tipo     | Descrição                                                                |
| ------------- | -------- | ------------------------------------------------------------------------ |
| `workspaceId` | `string` | ID do workspace.                                                         |
| `operation`   | `string` | Sempre `"orderCart"`.                                                    |
| `data.cart`   | `object` | Estrutura do carrinho ([ver cart base](#estrutura-base-do-objeto-cart)). |
| `data.total`  | `number` | Valor total do carrinho.                                                 |

#### Exemplo `orderCart`

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "operation": "orderCart",
  "data": {
    "cart": {...estrutura base do cart...},
    "total": 59.72
  }
}
```

---

#### Estrutura do payload – `upsertProduct`

| Campo         | Tipo     | Descrição                                                                |
| ------------- | -------- | ------------------------------------------------------------------------ |
| `workspaceId` | `string` | ID do workspace.                                                         |
| `operation`   | `string` | Sempre `"upsertProduct"`.                                                |
| `data.cart`   | `object` | Estrutura do carrinho ([ver cart base](#estrutura-base-do-objeto-cart)). |
| `data.total`  | `number` | Valor total atualizado do carrinho.                                      |

#### Exemplo `upsertProduct`

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "operation": "upsertProduct",
  "data": {
    "cart": {...estrutura base do cart...},
    "total": 73.03
  }
}
```

---

#### Estrutura do payload – `removeProduct`

| Campo            | Tipo     | Descrição                                                                |
| ---------------- | -------- | ------------------------------------------------------------------------ |
| `workspaceId`    | `string` | ID do workspace.                                                         |
| `operation`      | `string` | Sempre `"removeProduct"`.                                                |
| `data.cart`      | `object` | Estrutura do carrinho ([ver cart base](#estrutura-base-do-objeto-cart)). |
| `data.total`     | `number` | Valor total atualizado após remoção.                                     |
| `data.productId` | `string` | ID do produto removido.                                                  |

#### Exemplo `removeProduct`

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "operation": "removeProduct",
  "data": {
    "cart": {...estrutura base do cart...},
    "total": 46.41,
    "productId": "17678"
  }
}
```

#### Estrutura do payload – `cancelCart`

| Campo         | Tipo     | Descrição                       |
| ------------- | -------- | ------------------------------- |
| `workspaceId` | `string` | ID do workspace.                |
| `operation`   | `string` | Sempre `"cancelCart"`.          |
| `data.id`     | `string` | ID do carrinho a ser cancelado. |

---

#### Exemplo `cancelCart`

```json
{
  "workspaceId": "5e398e1a-09fa-4c14-9b04-4fac059ec913",
  "operation": "cancelCart",
  "data": {
    "id": "85fe98s6-0rgs-43h4-85bb-761573482156"
  }
}
```

---

## Passos para instalação

### 1. **Gerar o executável**

Para gerar o executável personalizado, utilize o seguinte comando:

```bash
 build.sh nome-cliente nome-unidade
```

O arquivo `looma-service-nome-cliente-nome-unidade.exe` será gerado usando as configurações do cliente informado.

### 2. **Enviar para o cliente**

Acessar o servidor através de software de acesso remoto, e enviar o arquivo gerado. Coloque o executável em uma pasta adequada, por exemplo: `C:\looma\`

### 3. **Criar o serviço no Windows**

Para criar um serviço, utilizar o comando:

```bash
sc create "Looma Service" binPath= "C:\looma\looma-service-nome-cliente-nome-unidade.exe" start= auto
```

**Observação:** O espaço após `binPath=` e `start=` é obrigatório.

### 4. **Gerenciar o serviço**

Para gerenciar através do prompt de comando, usar os seguintes comandos:

- Iniciar o serviço:

```bash
sc start "Looma Service"
```

- Parar o serviço:

```bash
sc stop "Looma Service"
```

- Deletar o serviço:

```bash
sc delete "Looma Service"
```

Também é possível acessar o **Gerenciador de Serviços do Windows**, abrindo o **Executar** e digitando `services.msc`.

### 5. **Verificar logs**

Use o Visualizador de Eventos do Windows para confirmar se o serviço está executando corretamente.

Os logs gerais do serviço podem ser acessados pelo Grafana, utilizando o nome da fila especificado no JSON de configuração.
