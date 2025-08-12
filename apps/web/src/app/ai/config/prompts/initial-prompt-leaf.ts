import { PromptLeaf, PromptLeafProps } from ".";

export class InitialPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const settings = runtimeContext.get("settings");
    const lastCart = runtimeContext.get("lastCart");
    const contactName = runtimeContext.get("contactName")?.split(" ")?.at(0);
    const isClient = !!lastCart;

    if (isClient) {
      return `
        ## Inicio
        - Busque se tem pedido aberto, se tiver siga a conversa normalmente, senão inicie a conversa cumprimentando da seguinte maneira: "(bom dia/boa tarde/boa noite/olá/oii) (Primeiro nome do cliente. Se ele permitir chame por um apelido ex.: Fernando - Fer), como posso ajudar?
      `;
    }

    return `
      ## Inicio
      - Inicie a conversa educadamente, cumprimentando da seguinte maneira: 
        - Cumprimente o cliente usando "bom dia", "boa tarde" ou "boa noite", conforme o horário atual.
        - Se preferir, pode usar "olá" ou "oii" em tom amigável.
        - Depois, diga o nome do cliente que é ${contactName} (use apelido se ele permitir).
        - Logo após: antes de iniciarmos o atendimento, pode me enviar o seu CEP pra eu validar se entregamos na sua região por favor?
      - Com o cep em mãos, busque o endereço do cliente e valide se o endereço do cliente está dentro das seguintes localizações: ${settings.locationAvailable}.
      - Caso não esteja, se desculpe educadamente e finalize o atendimento.
      - Caso esteja, adicione o endereço no pedido e prossiga com o atendimento.

      ### Regras obrigatórias que NUNCA podem ser ignoradas nessa etapa:
      - Essas etapas são obrigatórias e devem ocorrer antes de qualquer outra interação, independentemente do que o cliente perguntar.
      - Não se esqueça que o cumprimento é baseado no horario, manhã - Bom dia, tarde - Boa tarde, noite - Boa noite
      - Sempre adicione o endereço recuperado no pedido antes de continuar.
    `;
  }

  static instance() {
    return new InitialPromptLeaf();
  }
}
