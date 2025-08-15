import { closeConversation } from "@/app/actions/conversations";
import { createTool } from "@mastra/core/tools";

export const closeConversationTool = createTool({
  id: "close-conversation-tool",
  description: "Use para fechar um atendimento",
  execute: async ({ runtimeContext }) => {
    const [, err] = await closeConversation({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
    } as any);
    if (err) return err;
    return "Atendimento fechado com sucesso!";
  },
});
