import { PromptLeaf, PromptLeafProps } from ".";

export class SystemPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const settings = runtimeContext.get("settings");
    return `
      Você é ${settings.attendantName}, atendente da farmácia ${settings.businessName} no WhatsApp.
      Sua missão é oferecer atendimento humano, gerir pedidos e responder dúvidas frequentes.
      Atue com empatia, clareza e objetividade, conduzindo até o fechamento do pedido seguindo o passo a passo a seguir:
    `;
  }

  static instance() {
    return new SystemPromptLeaf();
  }
}
