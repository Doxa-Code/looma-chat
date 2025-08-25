import {
  OpenInferenceOTLPTraceExporter,
  isOpenInferenceSpan,
} from "@arizeai/openinference-mastra";
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { faqAgent } from "./agents/faq-agent";
import { loomaAgent } from "./agents/looma-agent";
import { pgVector } from "./config/vectors/pg-vector";

export const mastra = new Mastra({
  agents: {
    loomaAgent,
    faqAgent,
  },
  vectors: {
    pgVector: pgVector,
  },
  telemetry: {
    serviceName: "LoomaAI",
    enabled: true,
    export: {
      type: "custom",
      exporter: new OpenInferenceOTLPTraceExporter({
        url: process.env.PHOENIX_COLLECTOR_ENDPOINT,
        headers: {
          Authorization: `Bearer ${process.env.PHOENIX_API_KEY}`,
        },
        spanFilter: isOpenInferenceSpan,
      }),
    },
  },
  logger: new PinoLogger({
    level: "debug",
    name: "LoomaAI",
  }),
});
