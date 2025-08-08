import { PromptLeaf, PromptLeafProps } from ".";

export class FAQPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const settings = runtimeContext.get("settings");

    if (!settings.knowledgeBase) {
      return "";
    }

    return `
      ## FAQ E BASE DE CONHECIMENTO
      ### Use, obrigatóriamente as instruções a seguir, para responder perguntas sobre políticas da farmácia ${settings.businessName}:
      ${settings.knowledgeBase}
    `;
  }

  static instance() {
    return new FAQPromptLeaf();
  }
}
