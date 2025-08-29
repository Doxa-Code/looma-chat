import { embed } from "ai";
import { azureEmbeddings } from "../ai/config/llms/azure";

interface EmbeddingDriver {
  run(value: string): Promise<number[]>;
}

export class AzureEmbeddingDriver implements EmbeddingDriver {
  async run(value: string): Promise<number[]> {
    const { embedding } = await embed({
      model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
        dimensions: 1536,
      }),
      value,
    });

    return embedding;
  }

  static instance() {
    return new AzureEmbeddingDriver();
  }
}
