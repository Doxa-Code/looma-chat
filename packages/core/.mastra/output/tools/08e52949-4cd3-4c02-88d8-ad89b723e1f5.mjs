import { createTool } from '@mastra/core/tools';
import { embed } from 'ai';
import { z } from 'zod';
import { c as azureEmbeddings, d as pinecone, s as saveMessageOnThread } from '../index2.mjs';
import { P as ProductsDatabaseRepository } from '../products-repository.mjs';
import '@mastra/memory';
import '@ai-sdk/azure';
import '@mastra/pg';
import '@mastra/core';
import '@pinecone-database/pinecone';
import 'drizzle-orm';
import '../schemas.mjs';
import '/Users/fernandosouza/dev/looma/node_modules/.pnpm/drizzle-orm@0.44.4_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@upstash+_pohuuurtoropy5iivcwxc6dgde/node_modules/drizzle-orm/postgres-js/index.cjs';
import 'postgres';
import '/Users/fernandosouza/dev/looma/node_modules/.pnpm/drizzle-orm@0.44.4_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@upstash+_pohuuurtoropy5iivcwxc6dgde/node_modules/drizzle-orm/pg-core/index.cjs';

const stockTool = createTool({
  id: "stock-tool",
  description: "use para verificar se o produto est\xE1 em estoque",
  inputSchema: z.object({
    query: z.string()
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    const { embedding } = await embed({
      model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
        dimensions: 1536
      }),
      value: context.query
    });
    const setting = runtimeContext.get("settings");
    const response = await pinecone.index("products").namespace(setting.vectorNamespace).query({
      topK: 30,
      vector: embedding,
      includeMetadata: true
    });
    const vectorProducts = response.matches.map((m) => m.metadata);
    if (!vectorProducts.length) return [];
    const productsRepository = ProductsDatabaseRepository.instance();
    const products = await productsRepository.listByIds(
      vectorProducts.map((i) => i?.id ?? ""),
      runtimeContext.get("workspaceId")
    );
    let result = "id,descri\xE7\xE3o,c\xF3digo,marca,pre\xE7o,estoque,pre\xE7o promocional,inicio da promo\xE7\xE3o,fim da promo\xE7\xE3o\n";
    result += products.filter((p) => p.stock > 0).sort((a, b) => a.price > b.price ? 1 : -1).map((p) => [
      p.id,
      p.description,
      p.code,
      p.manufactory,
      p.price,
      p.stock,
      p.promotionPrice,
      p.promotionStart,
      `${p.promotionEnd}
`
    ]).join(",");
    if (threadId && resourceId) {
      await saveMessageOnThread({
        content: result,
        resourceId,
        threadId
      });
    }
    return result;
  }
});
const promotionProductsTool = createTool({
  id: "promotion-products-tool",
  description: "use para consultar os produtos do estoque que est\xE3o em promo\xE7\xE3o",
  inputSchema: z.object({
    query: z.string().describe("Nome de produtos pr\xF3ximo aos do pedido.")
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    const { embedding } = await embed({
      model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
        dimensions: 1536
      }),
      value: context.query
    });
    const setting = runtimeContext.get("settings");
    const response = await pinecone.index("products").namespace(setting.vectorNamespace).query({
      topK: 30,
      vector: embedding,
      includeMetadata: true
    });
    const vectorProducts = response.matches.map((m) => m.metadata);
    if (!vectorProducts.length) return [];
    const productsRepository = ProductsDatabaseRepository.instance();
    const products = await productsRepository.listByIds(
      vectorProducts.map((i) => i?.id ?? ""),
      runtimeContext.get("workspaceId")
    );
    const result = products.filter((p) => p.stock > 0).sort((a, b) => a.price > b.price ? 1 : -1);
    await saveMessageOnThread({
      content: result,
      resourceId,
      threadId
    });
    return result;
  }
});

export { promotionProductsTool, stockTool };
