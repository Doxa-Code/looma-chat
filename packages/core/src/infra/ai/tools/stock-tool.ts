import { createTool } from "@mastra/core/tools";
import { embed } from "ai";
import { z } from "zod";
import { Setting } from "../../../domain/value-objects/setting";
import { ProductsDatabaseRepository } from "../../repositories/products-repository";
import { azureEmbeddings } from "../config/llms/azure";
import { pgVector } from "../config/vectors/pg-vector";
import { saveMessageOnThread } from "../utils";

function normalize(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
  return vector.map((val) => val / norm);
}

export const stockTool = createTool({
  id: "stock-tool",
  description: "use para verificar se o produto está em estoque",
  inputSchema: z.object({
    query: z.string().describe("Nome do produto e/ou apresentação"),
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    console.log("STOCK PRODUCTS: ", { context });
    try {
      const { embedding } = await embed({
        model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
          dimensions: 1536,
        }),
        value: context.query,
      });

      const setting = runtimeContext.get("settings") as Setting;

      const normalizeEmbedding = normalize(embedding);

      const vectorProducts = await pgVector.query({
        indexName: `products-${setting.vectorNamespace}`.replace(/-/gim, "_"),
        queryVector: normalizeEmbedding,
        topK: 30,
        ef: 200,
        probes: 20,
      });

      if (!vectorProducts.length) return [];

      const productsRepository = ProductsDatabaseRepository.instance();

      const products = await productsRepository.listByIds(
        vectorProducts
          .sort((a, b) => (a.score > b.score ? 1 : -1))
          .map((i) => i?.id ?? ""),
        runtimeContext.get("workspaceId")
      );

      const productsWithStock = products
        .filter((p) => p.stock > 0)
        .sort((a, b) => (a.price > b.price ? 1 : -1));

      if (!productsWithStock.length)
        return "Nenhum produto solicitado em estoque!";

      await saveMessageOnThread({
        content: productsWithStock,
        resourceId,
        threadId,
      });

      return productsWithStock;
    } catch (err) {
      console.log(err);
      return [];
    }
  },
});

export const promotionProductsTool = createTool({
  id: "promotion-products-tool",
  description:
    "use para consultar os produtos do estoque que estão em promoção",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Nome de produtos próximo aos itens do pedido do cliente."),
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    console.log("PROMOTION PRODUCTS: ", { context });
    try {
      const { embedding } = await embed({
        model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
          dimensions: 1536,
        }),
        value: context.query,
      });

      const setting = runtimeContext.get("settings") as Setting;

      const normalizeEmbedding = normalize(embedding);

      const vectorProducts = await pgVector.query({
        indexName: `products-${setting.vectorNamespace}`.replace(/-/gim, "_"),
        queryVector: normalizeEmbedding,
        topK: 30,
        ef: 200,
        probes: 20,
      });

      if (!vectorProducts.length) return [];

      const productsRepository = ProductsDatabaseRepository.instance();

      const products = await productsRepository.listByIds(
        vectorProducts
          .sort((a, b) => (a.score > b.score ? 1 : -1))
          .map((i) => i?.id ?? ""),
        runtimeContext.get("workspaceId")
      );

      const productsWithStock = products
        .filter((p) => p.stock > 0 && p.promotionEnd !== null)
        .sort((a, b) => (a.price > b.price ? 1 : -1));

      if (!productsWithStock.length)
        return "Nenhum produto solicitado em estoque!";

      await saveMessageOnThread({
        content: productsWithStock,
        resourceId,
        threadId,
      });

      return productsWithStock;
    } catch (err) {
      console.log(err);
      return [];
    }
  },
});
