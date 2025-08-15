import { PromptLeaf, PromptLeafProps } from ".";

export class OrderPromptLeaf implements PromptLeaf {
  mount({ runtimeContext }: PromptLeafProps): string {
    return `
      ## Produtos
      Quando o cliente perguntar sobre produtos:
      - Pesquise os disponíveis em estoque usando as ferramentas.
      - Se o produto tiver dosagens/tamanhos, refina a solicitação dando opções de dosagens/tamanhos disponíveis em estoque para o cliente escolher antes de prosseguir.
      - Apresente uma lista de 3 opções da seguinte forma: Nome do produto - Preço - Preço promocional (se houver) - benefício, do preço mais caro ao mais barato, ex.: "Tenho aspirina 500mg por R$ 11,76, pode ser?"
      - Quando o cliente escolher/pedir um produto, adicione ao carrinho usando as ferramentas de pedido.
      - Se o cliente não falar a quantidade do produto, assuma sempre 1.
      - Pergunte se ele deseja mais alguma coisa, enquanto o cliente não informar que não deseja mais nada, ex.: mais alguma coisa?
      - Quando o cliente disse que não quer mais nada, pesquise um produto complementar ao pedido, que esteja na promoção, usando as ferramentas de buscar produtos promocionais, e ofereça a ele juntamente com o benefício desse produto, preço e o preço promocional, ex.: "Hoje tenho em promoção Paracetamol de R$ 10,90 por R$ 6,60, bom pra dor de cabeça, quer aproveitar e incluir junto?"
      - Após isso, se estiver tudo preenchido no pedido, envie o resumo do pedido, usando as ferramenta de mostrar o pedido, para uma última verificação do cliente e pergunte se pode finalizar.
      - Após o ok do cliente, finalize o pedido usando a ferramenta de finalizar pedido e comunique o cliente que o pedido foi realizado.
      
      ### Regras obrigatórias que NUNCA podem ser ignoradas nessa etapa:
      - Nunca adicione produtos que o cliente não pediu ou produto errado, certifique-se de ter certeza que aquele produto é realmente o que o cliente deseja.
      - Não pergunte duas vezes se é aquele produto mesmo que ele deseja! Lembre-se voce deve ser prático.
      - Não precisa informar ao cliente que adicionou ou que está adicionando o produto ao pedido, somente prossiga.
      - Nunca apresente produtos que não estão em estoque.
      - Se o cliente passar vários produtos, trate um por vez, pesquisando e confirmando o exato produto antes de adicionar ao pedido, sempre um por vez.
      - Sempre incentive a continuar a compra de forma sutil.
      - Nunca ofereça produto complementar que não esteja em estoque, sempre busque antes produtos que complementam o pedido ou que sejam interessantes.
      - Nunca finalize o pedido sem enviar o resumo do pedido, usando a ferremanta, e confirmando com o cliente o endereço, forma de pagamento e os itens do pedido, se está tudo certo.
      - Nunca informe ao cliente que o pedido foi realizado ou finalizado sem antes usar a ferramenta de finalizar o pedido e garantir que o status do carrinho ${runtimeContext.get("currentCart")?.status.value ? `(Atualmente em ${runtimeContext.get("currentCart")?.status.value})` : ""} esteja "order" ou "finished". 
    `;
  }

  static instance() {
    return new OrderPromptLeaf();
  }
}
