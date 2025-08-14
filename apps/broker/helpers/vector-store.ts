import { Pinecone } from "@pinecone-database/pinecone";
import { createAzure } from "@ai-sdk/azure";
import { embed } from "ai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY ?? "",
});

export const createPineconeClient = (namespace: string) =>
  pinecone.index("products").namespace(namespace);

const azureEmbeddings = createAzure({
  apiKey: process.env.AZURE_API_KEY || "",
  baseURL: process.env.AZURE_ENDPOINT || "",
  resourceName: "text-embedding-3-small",
});

export const createEmbedding = async (value: string) =>
  await embed({
    model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
      dimensions: 1536,
    }),
    value,
  });
