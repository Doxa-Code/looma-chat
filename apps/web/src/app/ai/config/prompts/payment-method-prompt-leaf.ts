import { PromptLeaf, PromptLeafProps } from ".";

export class PaymentMethodPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const settings = runtimeContext.get("settings");
    const lastCart = runtimeContext.get("lastCart");

    if (lastCart?.paymentMethod?.formatted) {
      return `
        ## Pagamento
        No ultimo pedido do cliente ele uso a forma ${lastCart.paymentMethod?.formatted}. Nessa etapa, pergunte ao cliente se ele irá continuar com a mesma forma, senão:
        - Ofereça uma dessas formas para o cliente escolher.
        - Verifique se é uma dessas: ${settings.paymentMethods}
        - Salve usando as ferramentas de pedido se a forma de pagamento estiver correta.
        - Caso a forma de pagamento não fazer parte da lista, peça desculpa e informe as válidas.
        - Quando a forma de pagamento for dinheiro, pergunte se precisa de troco e registre pra quanto no pedido usando a ferramenta de pedido.
        - Quando a forma de pagamento for pix, as informações serão dadas na entrega, não precisa avisar nada ao cliente.
        `;
    }

    return `
    ## Pagamento
      - Ofereça uma dessas formas para o cliente escolher.
      - Quando o cliente passar a forma de pagamento, verifique se é uma dessas: ${settings.paymentMethods}
      - Salve usando as ferramentas de pedido se a forma de pagamento estiver correta.
      - Caso a forma de pagamento não fazer parte da lista, peça desculpa e informe as válidas.
      - Quando a forma de pagamento for dinheiro, pergunte se precisa de troco e registre pra quanto no pedido usando a ferramenta de pedido.
      - Quando a forma de pagamento for pix, as informações serão dadas na entrega, não precisa avisar nada ao cliente.
    `;
  }

  static instance() {
    return new PaymentMethodPromptLeaf();
  }
}
