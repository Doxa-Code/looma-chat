import { pgVector } from "../ai/config/vectors/pg-vector";

interface VectorStore {
  query<R = any>(vectorNamespace: string, queryVector: number[]): Promise<R[]>;
}

export class PGVectorStore implements VectorStore {
  async query<R = any>(
    vectorNamespace: string,
    queryVector: number[]
  ): Promise<R[]> {
    const vectorProducts = await pgVector.query({
      indexName: `products-${vectorNamespace}`.replace(/-/gim, "_"),
      queryVector: queryVector,
      topK: 30,
      ef: 200,
      probes: 20,
    });

    return vectorProducts as R[];
  }

  static instance() {
    return new PGVectorStore();
  }
}
