import { PromptLeaf, PromptLeafProps } from ".";

export class AddressPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    const lastCart = runtimeContext.get("lastCart");
    const currentCart = runtimeContext.get("currentCart");

    if (lastCart) {
      return `
        ## Endereço
        No ultimo pedido do cliente informou o endereço ${lastCart.address?.fullAddress()}. Nessa etapa, pergunte ao cliente se ele deseja continuar no mesmo endereço, senão:
        - Peça primeiramente o cep do cliente e pesquise o endereço pra facilitar pro cliente.
        - Caso não encontre o endereço com a ferramenta de busca, peça o endereço completo de entrega, senão peça somente os campos faltantes do endereço (normalmente número da casa e completo se houver).  
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
