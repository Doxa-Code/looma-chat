import { Memory } from '@mastra/memory';
import { createAzure } from '@ai-sdk/azure';
import { PostgresStore, PgVector } from '@mastra/pg';

const azure = createAzure({
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: process.env.AZURE_API_VERSION,
  baseURL: process.env.AZURE_ENDPOINT
});
const azureEmbeddings = createAzure({
  apiKey: process.env.AZURE_API_KEY || "",
  baseURL: process.env.AZURE_ENDPOINT || "",
  resourceName: "text-embedding-3-small"
});

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL
});

const pgVector = new PgVector({
  connectionString: process.env.DATABASE_URL ?? ""
});

const memoryWithVector = new Memory({
  embedder: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
    dimensions: 1536
  }),
  storage,
  vector: pgVector,
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

export { azure as a, azureEmbeddings as b, memoryWithVector as m, pgVector as p, saveMessageOnThread as s };
