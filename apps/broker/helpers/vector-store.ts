import { createAzure } from "@ai-sdk/azure";
import { embed } from "ai";

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
