import { Mastra } from "@mastra/core/mastra";
import { pineconeVector } from "./config/vectors/pinecone-vector";
import { PinoLogger } from "@mastra/loggers";
import { loomaAgent } from "./agents/looma-agent";

export const mastra = new Mastra({
  agents: {
    loomaAgent,
  },
  vectors: {
    pinecone: pineconeVector,
  },
  telemetry: {
    enabled: false,
  },
  logger: new PinoLogger({
    level: "debug",
    formatters: {
      log(object: any) {
        if (object?.result?.text) {
          return {
            ai: object?.result?.text,
          };
        }
        return {
          toolResults: object?.toolResults,
        };
      },
    },
  }),
});
