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

## Fila de Clientes

- **Descrição:** Recebe os dados de clientes do servidor, utilizados para consultar informações de desconto.
- **Escopo:** Fila comum entre os clientes.
- **Fluxo:** `Looma Service (Servidor)` → `Fila` → `Looma Chat`

### Estrutura do payload

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
| `client.address.state`        | `string`         | Estado (sigla)                                   |
| `client.address.zipCode`      | `string`         | CEP                                              |
| `client.address.country`      | `string`         | País (fixo como "Brasil")                        |
| `client.address.note`         | `string \| null` | Observação ou complemento do endereço (opcional) |

### Exemplo de mensagem

```json
{
  "workspaceId": "c2d27d7a-1c04-451b-b7f9-548f2faf3bd3",
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

## Fila de Produtos

- **Descrição:** Recebe todos os produtos da base do cliente, mantendo a Looma atualizada com estoque e preço atual.
- **Escopo:** Fila comum entre os clientes.
- **Fluxo:** `Looma Service (Servidor)` → `Fila` → `Looma Chat`

### Estrutura do payload

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

### Exemplo de mensagem

```json
{
  "workspaceId": "c2d27d7a-1c04-451b-b7f9-548f2faf3bd3",
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

#### Exemplo:

```json

```

### Fila de Carrinhos (Handler)

- **Descrição:** Recebe os carrinhos gerados pela Looma para serem inseridos no sistema do cliente.
- **Escopo:** Fila única por cliente.
- **Fluxo:** Looma Chat -> Fila -> Looma Service no servidor do cliente
- **Operações Disponíveis:**
  - `orderCart` – Finaliza o carrinho e envia para o sistema do cliente.
  - `upsertProduct` – Adiciona ou atualiza um produto no carrinho.
  - `removeProduct` – Remove um produto do carrinho.
  - `cancelCart` – Cancela o carrinho.

#### Exemplo `orderCart`:

```json

```

#### Exemplo `upsertProduct`:

```json

```

#### Exemplo `removeProduct`:

```json

```

#### Exemplo `cancelCart`:

```json

```

---

## Gerando a Build

Para gerar o executável personalizado, utilize o seguinte comando:

```bash
 build.sh nome-cliente nome-unidade
```

O arquivo `.exe` será gerado usando as configurações do cliente informado.
