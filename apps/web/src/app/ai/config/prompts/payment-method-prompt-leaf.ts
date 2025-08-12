import { PromptLeaf, PromptLeafProps } from ".";

export class PaymentMethodPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const settings = runtimeContext.get("settings");

    return `
    ## Pagamento
      - Ofereça uma dessas formas para o cliente escolher.
      - Quando o cliente passar a forma de pagamento, verifique se é uma dessas: ${settings.paymentMethods}
      - Salve usando as ferramentas de pedido se a forma de pagamento estiver correta.
      - Caso a forma de pagamento não fazer parte da lista, peça desculpa e informe as válidas.
      - Quando a forma de pagamento for dinheiro, pergunte se precisa de troco e registre pra quanto no pedido usando a ferramenta de pedido.
    `;
  }

  static instance() {
    return new PaymentMethodPromptLeaf();
  }
}
