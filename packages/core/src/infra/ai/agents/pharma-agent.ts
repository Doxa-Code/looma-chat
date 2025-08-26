import { createTool } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import z from "zod";
import { azure } from "../config/llms/azure";
import { memoryWithVector } from "../config/memories";
import { Context } from "../config/prompts";
import { prompt } from "../config/prompts/pharma-prompt";
import { promotionProductsTool, stockTool } from "../tools/stock-tool";

export const pharmaAgent = new Agent({
  name: "Pharma Agent",
  instructions: prompt,
  model: azure("gpt-4.1", {
    parallelToolCalls: true,
  }),
  memory: memoryWithVector,
  tools: {
    stockTool,
    promotionProductsTool,
  },
});

export const pharmaAgentTool = createTool({
  description: "Use para chamar o farmaceutico",
  id: "pharma-agent-tool",
  inputSchema: z.object({
    question: z.string(),
  }),
  async execute({ context, ...props }) {
    const runtimeContext = props.runtimeContext as RuntimeContext<Context>;

    const response = await pharmaAgent.generate(context.question, {
      runtimeContext,
      memory: runtimeContext.get("agentOptions").memory,
      telemetry: runtimeContext.get("agentOptions").telemetry,
    });

    return response.text;
  },
});
