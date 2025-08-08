import { PromptLeaf, PromptLeafProps } from ".";

export class RelevantPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const currentDateTime = new Date().toLocaleString("pt-BR");
    const contactName = runtimeContext.get("contactName")?.split(" ")?.at(0);
    const lastCart = runtimeContext.get("lastCart");
    const isClient = !!lastCart;

    let result = `
      ## INFORMAÇÕES RELEVANTES
      - Agora são exatamente ${currentDateTime} horário local.
      - Você está atendendo agora o cliente ${contactName}
    `;

    if (isClient) {
      result += `
        - Na última compra, o cliente fez a seguinte compra.
        ${lastCart.formatted}
      `;
    }

    return result;
  }

  static instance() {
    return new RelevantPromptLeaf();
  }
}
