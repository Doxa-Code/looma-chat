import {
  CreateIndexParams,
  DeleteIndexParams,
  DeleteVectorParams,
  DescribeIndexParams,
  IndexStats,
  MastraVector,
  QueryResult,
  QueryVectorParams,
  UpdateVectorParams,
  UpsertVectorParams,
} from "@mastra/core";
import { VectorFilter } from "@mastra/core/vector/filter";
import { Pinecone } from "@pinecone-database/pinecone";

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY ?? "",
});

export class PineconeMastraVector extends MastraVector {
  private getIndex(name: string) {
    return pinecone.index(this.normalizeName(name));
  }

  private normalizeName(name: string) {
    return name.replace("_", "-");
  }

  async query(params: QueryVectorParams<VectorFilter>): Promise<QueryResult[]> {
    const index = this.getIndex(params.indexName);

    const response = await index.query({
      topK: params.topK ?? 10,
      includeMetadata: true,
      vector: params.queryVector,
      filter: params.filter ?? undefined,
    });

    return (response.matches ?? []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata ?? {},
    }));
  }

  async upsert(params: UpsertVectorParams): Promise<string[]> {
    const index = this.getIndex(params.indexName);

    const vectors =
      params.metadata?.map((m, idx) => ({
        id: m.message_id,
        values: params.vectors?.[idx] ?? [],
        metadata: m,
      })) || [];

    if (!vectors.length) return [];

    await index.upsert(vectors);

    return vectors.map((v) => v.id);
  }

  async createIndex(params: CreateIndexParams): Promise<void> {
    const indexes = await this.listIndexes();
    if (indexes.includes(this.normalizeName(params.indexName))) return;
    await pinecone.createIndex({
      name: this.normalizeName(params.indexName),
      dimension: params.dimension,
      metric: params.metric ?? "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
  }

  async listIndexes(): Promise<string[]> {
    const response = await pinecone.listIndexes();
    return response.indexes?.map((i) => i.name) ?? [];
  }

  async describeIndex(params: DescribeIndexParams): Promise<IndexStats> {
    const index = this.getIndex(params.indexName);
    const stats = await index.describeIndexStats();
    return {
      count: stats.totalRecordCount ?? 0,
      dimension: stats.dimension ?? 1536,
    };
  }

  async deleteIndex(params: DeleteIndexParams): Promise<void> {
    await pinecone.deleteIndex(this.normalizeName(params.indexName));
  }

  async updateVector(params: UpdateVectorParams): Promise<void> {
    const index = this.getIndex(params.indexName);
    await index.update({
      id: params.id,
      metadata: params.update.metadata,
      values: params.update.vector,
    });
  }

  async deleteVector(params: DeleteVectorParams): Promise<void> {
    const index = this.getIndex(params.indexName);
    await index.deleteOne(params.id);
  }
}

export const pineconeVector = new PineconeMastraVector();
