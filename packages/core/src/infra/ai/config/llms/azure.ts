import { createAzure } from "@ai-sdk/azure";

export const azure = createAzure({
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: process.env.AZURE_API_VERSION,
  baseURL: process.env.AZURE_ENDPOINT,
});

export const azureEmbeddings = createAzure({
  apiKey: process.env.AZURE_API_KEY || "",
  baseURL: process.env.AZURE_ENDPOINT || "",
  resourceName: "text-embedding-3-small",
});
