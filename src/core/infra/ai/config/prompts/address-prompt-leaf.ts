import { PromptLeaf, PromptLeafProps } from ".";

export class AddressPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const lastCart = runtimeContext.get("lastCart");
    const isClient = !!lastCart;

    if (isClient) {
      return `
        ## Endereço
        Nessa etapa de endereço, pergunte ao cliente se ele deseja continuar no endereço: ${lastCart.address?.fullAddress()}.
      `;
    }

    return `
      ## Endereço
      - Peça primeiramente o cep do cliente e pesquise o endereço pra facilitar pro cliente.
      - Caso não encontre o endereço com a ferramenta de busca, peça o endereço completo de entrega, senão peça somente os campos faltantes do endereço (normalmente número da casa e completo se houver).
    `;
  }

  static instance() {
    return new AddressPromptLeaf();
  }
}
