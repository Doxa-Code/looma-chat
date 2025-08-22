import { createTool } from "@mastra/core/tools";
import { ClientsDatabaseRepository } from "../../repositories/clients-repository";
import { CloseConversation } from "../../../application/command/close-conversation";

const clientsRepository = ClientsDatabaseRepository.instance();

export const closeConversationTool = createTool({
  id: "close-conversation-tool",
  description: "Use para fechar um atendimento",
  execute: async ({ runtimeContext }) => {
    const closeConversation = CloseConversation.instance();
    await closeConversation.execute({
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
    });
    return "Atendimento fechado com sucesso!";
  },
});

export const retrieveClientTool = createTool({
  id: "retrieve-client-tool",
  description: "Use para recuperar o cadastro do cliente",
  execute: async ({ runtimeContext }) => {
    const client = await clientsRepository.retrieveByPhone(
      runtimeContext.get("clientPhone"),
      runtimeContext.get("workspaceId")
    );
    return client?.raw() ?? "Cliente não cadastrado";
  },
});
