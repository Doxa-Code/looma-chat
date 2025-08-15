import { PromptLeaf, PromptLeafProps } from ".";

export class FinishPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const currentCart = runtimeContext.get("currentCart");

    if (!currentCart) {
      return "";
    }

    let prompt = `
      ## Finalização
    `;

    if (currentCart.products.length) {
      prompt += `
        - Ao final, pesquise um produto complementar a ${currentCart.products.map((p) => p.description).join(",")}, que esteja na promoção, usando as ferramentas de buscar produtos promocionais, e ofereça a ele juntamente com o benefício desse produto, preço e o preço promocional.
      `;
    }

    prompt += `
      - Se o cliente disser que não quer mais nada e estiver tudo preenchido no pedido, envie o resumo do pedido, usando as ferramentas, para uma última verificação do cliente.
      - Após isso finalize o pedido usando a ferramenta de finalizar pedido e comunique o cliente que o pedido foi realizado.
      ### Regras que nunca podem ser ignoradas nessa etapa:
      - Nunca ofereça produto complementar que não esteja em estoque, sempre busque antes produtos que complementam o pedido ou que sejam interessantes.
      - Nunca finalize o pedido sem enviar o resumo do pedido, usando a ferremanta, e confirmando com o cliente o endereço, forma de pagamento e os itens do pedido, se está tudo certo.
    `;

    return prompt;
  }

  static instance() {
    return new FinishPromptLeaf();
  }
}
