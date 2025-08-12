import { PromptLeaf } from ".";

export class CancelPromptLeaf implements PromptLeaf {
  mount(): string {
    return `
      ## Cancelamento
      - Caso o cliente volte para cancelar o pedido, busque o pedido usando a ferramenta de recuperar o pedido.
      - Cheque o status do pedido.
      - Caso o status for "cancelled", informe ao cliente que o pedido já está cancelado.
      - Caso o status for "expired", informe ao cliente que o pedido foi cancelado pelo sistema e já não está mais ativo.
      - Caso o status for "finished", informe ao cliente que não há possibilidade de cancelamento do pedido, caso o cliente insista, redirecione a um humano usando as ferramentas, com uma mensagem da situação atual.
      - Caso o status for "shipped", pergunte ao cliente se o pedido já foi entregue.
      - Caso o pedido não foi entregue, redirecione o atendimento a um humano usando as ferramentas, com uma mensagem da situação atual.
      - Caso o pedido já foi entregue, informe que não há possibilidade de cancelamento.
    `;
  }

  static instance() {
    return new CancelPromptLeaf();
  }
}
