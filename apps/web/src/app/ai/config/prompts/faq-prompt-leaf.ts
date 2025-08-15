import { PromptLeaf, PromptLeafProps } from ".";

export class FAQPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const settings = runtimeContext.get("settings");

    if (!settings.knowledgeBase) {
      return "";
    }

    return `
      ## FAQ E BASE DE CONHECIMENTO
      ### Instruções da farmácia que em Hipotese nenhum pode ser ignoradas ou não utilizadas:
      ${settings.knowledgeBase}
    `;
  }

  static instance() {
    return new FAQPromptLeaf();
  }
}
