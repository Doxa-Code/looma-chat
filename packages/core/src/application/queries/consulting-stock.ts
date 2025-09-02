import { Product } from "../../domain/value-objects/product";
import { AzureEmbeddingDriver } from "../../infra/drivers/embedding-driver";
import { ProductsDatabaseRepository } from "../../infra/repositories/products-repository";

interface EmbeddingDriver {
  run(value: string): Promise<number[]>;
}

interface ProductsRepository {
  vectorSearch(
    embedding: number[],
    workspaceId: string
  ): Promise<Product.Props[]>;
}

export class ConsultingStock {
  constructor(
    private readonly embeddingDriver: EmbeddingDriver,
    private readonly productsRepository: ProductsRepository
  ) {}

  async execute(input: InputDTO) {
    const embedding = await this.embeddingDriver.run(input.query);

    const products = await this.productsRepository.vectorSearch(
      embedding,
      input.workspaceId
    );

    if (!products.length) return [];

    return products;
  }

  static instance() {
    return new ConsultingStock(
      AzureEmbeddingDriver.instance(),
      ProductsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  workspaceId: string;
  query: string;
};
