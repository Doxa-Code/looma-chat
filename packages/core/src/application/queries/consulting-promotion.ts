import { Product } from "../../domain/value-objects/product";
import { Setting } from "../../domain/value-objects/setting";
import { AzureEmbeddingDriver } from "../../infra/drivers/embedding-driver";
import { PGVectorStore } from "../../infra/drivers/vector-driver";
import { ProductsDatabaseRepository } from "../../infra/repositories/products-repository";
import { SettingsDatabaseRepository } from "../../infra/repositories/settings-repository";

interface SettingsRepository {
  retrieveSettingsByWorkspaceId(workspaceId: string): Promise<Setting | null>;
}

interface EmbeddingDriver {
  run(value: string): Promise<number[]>;
}

interface VectorStore {
  query<R = any>(vectorNamespace: string, queryVector: number[]): Promise<R[]>;
}

interface ProductsRepository {
  listByIds(ids: string[], workspaceId: string): Promise<Product.Props[]>;
}

export class ConsultingPromotion {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly embeddingDriver: EmbeddingDriver,
    private readonly vectorStore: VectorStore,
    private readonly productsRepository: ProductsRepository
  ) {}

  private normalize(vector: number[]) {
    const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
    return vector.map((val) => val / norm);
  }

  async execute(input: InputDTO) {
    const setting = await this.settingsRepository.retrieveSettingsByWorkspaceId(
      input.workspaceId
    );
    if (!setting) return [];

    const embedding = await this.embeddingDriver.run(input.query);
    const normalizeEmbedding = this.normalize(embedding);

    const vectorProducts = await this.vectorStore.query<{
      score: number;
      id: string;
    }>(setting.vectorNamespace, normalizeEmbedding);

    const products = await this.productsRepository.listByIds(
      vectorProducts
        .sort((a, b) => (a.score > b.score ? 1 : -1))
        .map((i) => i?.id ?? ""),
      input.workspaceId
    );

    const productsWithStock = products
      .filter((p) => p.stock > 0 && p.promotionEnd !== null)
      .sort((a, b) => (a.price > b.price ? 1 : -1));

    if (!productsWithStock.length) return [];

    return productsWithStock;
  }

  static instance() {
    return new ConsultingPromotion(
      SettingsDatabaseRepository.instance(),
      AzureEmbeddingDriver.instance(),
      PGVectorStore.instance(),
      ProductsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  workspaceId: string;
  query: string;
};
