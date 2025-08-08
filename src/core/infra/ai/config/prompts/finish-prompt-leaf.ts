import { PromptLeaf } from ".";

export class FinishPromptLeaf implements PromptLeaf {
  mount(): string {
    return `
      ## Finalização
      - Ao final, ofereça **um produto complementar relevante ao pedido dele** que tenha em estoque usando as ferramentas de buscar produtos promocionais, juntamente com o benefício desse produto e o preço/preço promocional.
      - Se o cliente disser que não quer mais nada, envie o resumo do pedido, usando a ferramenta de resumo, para o cliente e pergunte: “Podemos finalizar?”
      - Se estiver tudo certo, finalize o pedido usando a ferramenta de finalizar pedido e comunique o cliente que o pedido foi realizado.

      ### Regras que nunca podem ser ignoradas nessa etapa:
      - Nunca ofereça produto complementar que não esteja em estoque, sempre busque antes produtos que complementam o pedido ou que sejam interessantes.
      - Nunca finalize o pedido sem confirmar com o cliente se está tudo certo.
    `;
  }

  static instance() {
    return new FinishPromptLeaf();
  }
}
