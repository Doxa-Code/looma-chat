# Requisitos Técnicos para Integração entre Looma Chat e Sistema do Cliente

A fim de garantir o pleno funcionamento do nosso produto e viabilizar sua integração com o sistema do cliente, apresentamos abaixo os requisitos técnicos necessários:

## 1. Registro de Carrinho/Venda

É necessário a disponibilização de um endpoint de API ou mecanismo equivalente que permita o registro de carrinhos ou vendas no sistema do cliente, acompanhado de documentação técnica detalhada contendo:

- Campos obrigatórios
- Regras de negócio envolvidas
- Validações aplicáveis

**Objetivo:** Registrar vendas de forma sincronizada com o sistema do cliente, assegurando integridade e rastreabilidade das transações.

## 2. Acesso ao Estoque de Produtos

Nosso sistema requer acesso para leitura periódica do estoque de produtos, com o objetivo de manter a base de dados atualizada. As informações mínimas necessárias incluem:

- Identificador único do produto
- Nome, descrição e fabricante
- Preço atual
- Preço promocional e período de vigência (quando aplicável)
- Quantidade disponível
- Status de disponibilidade (ativo/inativo)

**Objetivo:** Evitar divergências de preço e disponibilidade, garantindo consistência entre os sistemas.

## 3. Acesso às Regras de Desconto

É necessário acesso às regras comerciais aplicadas no sistema do cliente, incluindo:

- Promoções por tempo limitado
- Descontos vinculados ao cadastro/fidelidade do cliente
- Cupons promocionais ou regras específicas por produto/categoria

Para descontos baseados em cadastro/fidelidade, será necessário o acesso à base de clientes ou um mecanismo de verificação de elegibilidade.

**Objetivo:** Garantir que os descontos sejam corretamente aplicados de acordo com as políticas vigentes.

## 4. (Opcional) Webhook de Conclusão de Venda

A disponibilização de um webhook que notifique nosso sistema sempre que uma venda for concluída (ou cancelada) no sistema do cliente é altamente recomendada. Informações mínimas:

- Id da venda
- Status final (concluída, cancelada, etc.)

**Objetivo:** Atualizar em tempo real a jornada de compra e permitir ações automatizadas, como facilitar o acompanhamento de pós venda.

## 5. Considerações Finais

Os acessos podem ser realizados via API REST, webhooks ou outros meios documentados. A comunicação entre sistemas deverá adotar mecanismos seguros de autenticação e autorização.
