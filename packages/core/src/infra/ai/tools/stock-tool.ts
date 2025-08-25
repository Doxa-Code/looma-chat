import { createTool } from "@mastra/core/tools";
import { embed } from "ai";
import { z } from "zod";
import { azureEmbeddings } from "../config/llms/azure";
import { pgVector } from "../config/vectors/pg-vector";
import { saveMessageOnThread } from "../utils";
import { Setting } from "../../../domain/value-objects/setting";
import { ProductsDatabaseRepository } from "../../repositories/products-repository";

function normalize(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
  return vector.map((val) => val / norm);
}

export const stockTool = createTool({
  id: "stock-tool",
  description: "use para verificar se o produto está em estoque",
  inputSchema: z.object({
    productName: z.string().describe("Nome do produto"),
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    try {
      const { embedding } = await embed({
        model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
          dimensions: 1536,
        }),
        value: context.productName,
      });

      const setting = runtimeContext.get("settings") as Setting;

      const normalizeEmbedding = normalize(embedding);

      const vectorProducts = await pgVector.query({
        indexName: `products-${setting.vectorNamespace}`.replace(/-/gim, "_"),
        queryVector: normalizeEmbedding,
        topK: 30,
      });

      if (!vectorProducts.length) return [];

      const productsRepository = ProductsDatabaseRepository.instance();

      const products = await productsRepository.listByIds(
        vectorProducts.map((i) => i?.id ?? ""),
        runtimeContext.get("workspaceId")
      );

      const productsWithStock = products
        .filter((p) => p.stock > 0)
        .sort((a, b) => (a.price > b.price ? 1 : -1));

      console.log({ products, productsWithStock });

      if (!productsWithStock.length)
        return "Nenhum produto solicitado em estoque!";

      let result =
        "id,descrição,código,marca,preço,estoque,preço promocional,inicio da promoção,fim da promoção\n";

      result += productsWithStock
        .map((p) => [
          p.id,
          p.description,
          p.code,
          p.manufactory,
          p.price,
          p.stock,
          p.promotionPrice,
          p.promotionStart,
          `${p.promotionEnd}\n`,
        ])
        .join(",");

      if (threadId && resourceId) {
        await saveMessageOnThread({
          content: result,
          resourceId,
          threadId,
        });
      }

      return result;
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
    query: z.string().describe("Nome de produtos próximo aos do pedido."),
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    try {
      const { embedding } = await embed({
        model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
          dimensions: 1536,
        }),
        value: context.query,
      });

      const setting = runtimeContext.get("settings") as Setting;

      const response = await pgVector.query({
        indexName: `products-${setting.vectorNamespace}`,
        queryVector: embedding,
        topK: 30,
      });

      const vectorProducts = response.map((m) => m.metadata);

      if (!vectorProducts.length) return [];

      const productsRepository = ProductsDatabaseRepository.instance();

      const products = await productsRepository.listByIds(
        vectorProducts.map((i) => i?.id ?? ""),
        runtimeContext.get("workspaceId")
      );

      let result =
        "id,descrição,código,marca,preço,estoque,preço promocional,inicio da promoção,fim da promoção\n";

      result += products
        .filter((p) => p.stock > 0 && p.promotionEnd !== null)
        .sort((a, b) => (a.price > b.price ? 1 : -1))
        .map((p) => [
          p.id,
          p.description,
          p.code,
          p.manufactory,
          p.price,
          p.stock,
          p.promotionPrice,
          p.promotionStart,
          `${p.promotionEnd}\n`,
        ])
        .join(",");

      await saveMessageOnThread({
        content: result,
        resourceId,
        threadId,
      });

      return result;
    } catch (err) {
      console.log(err);
      return [];
    }
  },
});
