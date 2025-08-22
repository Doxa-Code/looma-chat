import { Agent } from "@mastra/core/agent";
import { azure } from "../config/llms/azure";
import { memoryWithVector } from "../config/memories";
import { prompt } from "../config/prompts/faq-prompt";
import { createTool } from "@mastra/core";
import z from "zod";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { Context } from "../config/prompts";

export const faqAgent = new Agent({
  name: "FAQ Agent",
  instructions: prompt,
  model: azure("gpt-4.1"),
  memory: memoryWithVector,
});

export const faqAgentTool = createTool({
  description: "Use para chamar o agente de FAQ",
  id: "faq-agent-tool",
  inputSchema: z.object({
    question: z.string(),
  }),
  async execute({ context, ...props }) {
    const runtimeContext = props.runtimeContext as RuntimeContext<Context>;

    const response = await faqAgent.generate(context.question, {
      runtimeContext,
      memory: runtimeContext.get("agentOptions").memory,
      telemetry: runtimeContext.get("agentOptions").telemetry,
    });

    return response.text;
  },
});
