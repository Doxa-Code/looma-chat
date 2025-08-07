import { createVectorQueryTool } from "@mastra/rag";
import { azureEmbeddings } from "../config/llms/azure";

// TODO: REVER ESSA TOOL
export const knowledgeBaseTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "looma-knowledge-base",
  model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
    dimensions: 1536,
  }),
  databaseConfig: {
    pinecone: {
      namespace: process.env.CLIENT_NAMESPACE,
    },
  },
});
