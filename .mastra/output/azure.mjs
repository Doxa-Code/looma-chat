import { createAzure } from '@ai-sdk/azure';

const azure = createAzure({
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: process.env.AZURE_API_VERSION,
  baseURL: process.env.AZURE_ENDPOINT,
  resourceName: "gpt-4.1"
});
const azureEmbeddings = createAzure({
  apiKey: process.env.AZURE_API_KEY || "",
  baseURL: process.env.AZURE_ENDPOINT || "",
  resourceName: "text-embedding-3-small"
});

export { azure as a, azureEmbeddings as b };
