import { Memory } from "@mastra/memory";
import { azureEmbeddings } from "./llms/azure";
import { storage } from "./storage";
import { pineconeVector } from "./vectors/pinecone-vector";

export const memoryWithVector = new Memory({
  embedder: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
    dimensions: 1536,
  }),
  storage,
  vector: pineconeVector,
  options: {
    semanticRecall: {
      scope: "resource",
      messageRange: 50,
      topK: 50,
    },
    lastMessages: 50,
  },
});
