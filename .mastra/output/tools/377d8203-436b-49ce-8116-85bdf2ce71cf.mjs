import { createVectorQueryTool } from '@mastra/rag';
import { b as azureEmbeddings } from '../azure.mjs';
import '@ai-sdk/azure';

const knowledgeBaseTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "looma-knowledge-base",
  model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
    dimensions: 1536
  }),
  databaseConfig: {
    pinecone: {
      namespace: process.env.CLIENT_NAMESPACE
    }
  }
});

export { knowledgeBaseTool };
