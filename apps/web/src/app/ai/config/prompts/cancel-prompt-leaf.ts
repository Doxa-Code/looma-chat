import { PromptLeaf, PromptLeafProps } from ".";

// TODO: inserir os sectors no context
export class CancelPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const currentCart = runtimeContext.get("currentCart");
    if (currentCart?.status.value === "budget") {
      return "";
    }
    let prompt = `
      ## Cancelamento
    `;

    if (!currentCart) {
      prompt += `
        - Não há carrinho aberto para o cliente cancelar, avise-o educadamente.
      `;
    }

    if (currentCart?.status.value === "cancelled") {
      prompt += `
        - Informe ao cliente que o pedido já está cancelado.
      `;
    }

    if (currentCart?.status.value === "expired") {
      prompt += `
        - Informe ao cliente que o pedido foi cancelado pelo sistema e já não está mais ativo.
      `;
    }

    if (currentCart?.status.value === "finished") {
      prompt += `
        - Informe ao cliente que não há possibilidade de cancelamento do pedido.
        - Caso o cliente insista, redirecione a um dos seguintes setores, usando as ferramentas, com uma mensagem da situação atual: ${runtimeContext.get("sectors")}
      `;
    }

    if (currentCart?.status.value === "shipped") {
      prompt += `
        - Pergunte ao cliente se o pedido já foi entregue
        - Caso o pedido não foi entregue, redirecione o atendimento a um dos seguintes setores: ${runtimeContext.get("sectors")} usando as ferramentas, com uma mensagem da situação atual.
        - Caso o pedido já foi entregue, informe que não há possibilidade de cancelamento.
      `;
    }

    return prompt;
  }

  static instance() {
    return new CancelPromptLeaf();
  }
}
