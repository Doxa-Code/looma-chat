import { Memory } from '@mastra/memory';
import { createAzure } from '@ai-sdk/azure';
import { PostgresStore } from '@mastra/pg';
import { MastraVector } from '@mastra/core';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY ?? ""
});
class PineconeMastraVector extends MastraVector {
  getIndex(name) {
    return pinecone.index(this.normalizeName(name));
  }
  normalizeName(name) {
    return name.replace("_", "-");
  }
  async query(params) {
    const index = this.getIndex(params.indexName);
    const response = await index.query({
      topK: params.topK ?? 10,
      includeMetadata: true,
      vector: params.queryVector,
      filter: params.filter ?? void 0
    });
    return (response.matches ?? []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata ?? {}
    }));
  }
  async upsert(params) {
    const index = this.getIndex(params.indexName);
    const vectors = params.metadata?.map((m, idx) => ({
      id: m.message_id,
      values: params.vectors?.[idx] ?? [],
      metadata: m
    })) || [];
    if (!vectors.length) return [];
    await index.upsert(vectors);
    return vectors.map((v) => v.id);
  }
  async createIndex(params) {
    const indexes = await this.listIndexes();
    if (indexes.includes(this.normalizeName(params.indexName))) return;
    await pinecone.createIndex({
      name: this.normalizeName(params.indexName),
      dimension: params.dimension,
      metric: params.metric ?? "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1"
        }
      }
    });
  }
  async listIndexes() {
    const response = await pinecone.listIndexes();
    return response.indexes?.map((i) => i.name) ?? [];
  }
  async describeIndex(params) {
    const index = this.getIndex(params.indexName);
    const stats = await index.describeIndexStats();
    return {
      count: stats.totalRecordCount ?? 0,
      dimension: stats.dimension ?? 1536
    };
  }
  async deleteIndex(params) {
    await pinecone.deleteIndex(this.normalizeName(params.indexName));
  }
  async updateVector(params) {
    const index = this.getIndex(params.indexName);
    await index.update({
      id: params.id,
      metadata: params.update.metadata,
      values: params.update.vector
    });
  }
  async deleteVector(params) {
    const index = this.getIndex(params.indexName);
    await index.deleteOne(params.id);
  }
}
const pineconeVector = new PineconeMastraVector();

const azure = createAzure({
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: process.env.AZURE_API_VERSION,
  baseURL: process.env.AZURE_ENDPOINT
});
const azureLooma = createAzure({
  apiKey: process.env.AZURE_API_KEY,
  baseURL: process.env.AZURE_ENDPOINT,
  apiVersion: "2024-12-01-preview"
});
const azureEmbeddings = createAzure({
  apiKey: process.env.AZURE_API_KEY || "",
  baseURL: process.env.AZURE_ENDPOINT || "",
  resourceName: "text-embedding-3-small"
});

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL
});

const memoryWithVector = new Memory({
  embedder: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
    dimensions: 1536
  }),
  storage,
  vector: pineconeVector,
  options: {
    semanticRecall: {
      scope: "resource",
      messageRange: 50,
      topK: 50
    },
    lastMessages: 5
  }
});

const saveMessageOnThread = async (props) => {
  const thread = await memoryWithVector.getThreadById({
    threadId: props.threadId
  });
  if (!thread) {
    await memoryWithVector.createThread({
      resourceId: props.resourceId,
      saveThread: true,
      threadId: props.threadId
    });
  }
  await memoryWithVector.saveMessages({
    messages: [
      {
        id: crypto.randomUUID().toString(),
        content: typeof props.content === "string" ? props.content : JSON.stringify(props.content, null, 2),
        role: "tool",
        createdAt: /* @__PURE__ */ new Date(),
        type: "tool-result",
        threadId: props.threadId,
        resourceId: props.resourceId
      }
    ]
  });
};

export { azure as a, azureLooma as b, azureEmbeddings as c, pinecone as d, memoryWithVector as m, pineconeVector as p, saveMessageOnThread as s };
