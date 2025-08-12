import { createTool } from "@mastra/core";
import { embed } from "ai";
import { z } from "zod";
import { ProductsRepository } from "../../repositories/products-repository";
import { azureEmbeddings } from "../config/llms/azure";
import { pinecone } from "../config/vectors/pinecone-vector";
import { saveMessageOnThread } from "../utils";

export const stockTool = createTool({
  id: "stock-tool",
  description: "use para verificar se o produto está em estoque",
  inputSchema: z.object({
    query: z.string(),
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    try {
      const { embedding } = await embed({
        model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
          dimensions: 1536,
        }),
        value: context.query,
      });

      const response = await pinecone
        .index<{ id: string; description: string; manufactory: string }>(
          "products"
        )
        .namespace(runtimeContext.get("vector-namespace"))
        .query({
          topK: 30,
          vector: embedding,
          includeMetadata: true,
        });

      const vectorProducts = response.matches.map((m) => m.metadata);

      if (!vectorProducts.length) return [];

      const productsRepository = ProductsRepository.instance();

      const products = await productsRepository.listByIds(
        vectorProducts.map((i) => i?.id ?? ""),
        runtimeContext.get("workspaceId")
      );

      const result = products
        .filter((p) => p.stock > 0)
        .sort((a, b) => (a.price > b.price ? 1 : -1));

      await saveMessageOnThread({
        content: result,
        resourceId,
        threadId,
      });

      return result;
    } catch (e) {
      console.log(e);
      return "";
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
    const { embedding } = await embed({
      model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
        dimensions: 1536,
      }),
      value: context.query,
    });

    const response = await pinecone
      .index<{ id: string; description: string; manufactory: string }>(
        "products"
      )
      .namespace(runtimeContext.get("vector-namespace"))
      .query({
        topK: 30,
        vector: embedding,
        includeMetadata: true,
      });

    const vectorProducts = response.matches.map((m) => m.metadata);

    if (!vectorProducts.length) return [];

    const productsRepository = ProductsRepository.instance();

    const products = await productsRepository.listByIds(
      vectorProducts.map((i) => i?.id ?? ""),
      runtimeContext.get("workspaceId")
    );

    const result = products
      .filter((p) => p.stock > 0)
      .sort((a, b) => (a.price > b.price ? 1 : -1));

    await saveMessageOnThread({
      content: result,
      resourceId,
      threadId,
    });

    return result;
  },
});
