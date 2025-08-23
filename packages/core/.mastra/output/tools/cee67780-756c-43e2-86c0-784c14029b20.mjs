import { createTool } from '@mastra/core/tools';
import { N as NotFound, b as ConversationsDatabaseRepository, c as ClientsDatabaseRepository } from '../conversations-repository.mjs';
import '../schemas.mjs';
import '/Users/fernandosouza/dev/looma/node_modules/.pnpm/drizzle-orm@0.44.4_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@upstash+_pohuuurtoropy5iivcwxc6dgde/node_modules/drizzle-orm/postgres-js/index.cjs';
import 'postgres';
import '/Users/fernandosouza/dev/looma/node_modules/.pnpm/drizzle-orm@0.44.4_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@upstash+_pohuuurtoropy5iivcwxc6dgde/node_modules/drizzle-orm/pg-core/index.cjs';
import 'drizzle-orm';

class CloseConversation {
  constructor(conversationsRepository) {
    this.conversationsRepository = conversationsRepository;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("conversation");
    conversation.close();
    await this.conversationsRepository.upsert(conversation, input.workspaceId);
    return conversation;
  }
  static instance() {
    return new CloseConversation(ConversationsDatabaseRepository.instance());
  }
}

const clientsRepository = ClientsDatabaseRepository.instance();
const closeConversationTool = createTool({
  id: "close-conversation-tool",
  description: "Use para fechar um atendimento",
  execute: async ({ runtimeContext }) => {
    const closeConversation = CloseConversation.instance();
    await closeConversation.execute({
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId")
    });
    return "Atendimento fechado com sucesso!";
  }
});
const retrieveClientTool = createTool({
  id: "retrieve-client-tool",
  description: "Use para recuperar o cadastro do cliente",
  execute: async ({ runtimeContext }) => {
    const client = await clientsRepository.retrieveByPhone(
      runtimeContext.get("clientPhone"),
      runtimeContext.get("workspaceId")
    );
    return client?.raw() ?? "Cliente n\xE3o cadastrado";
  }
});

export { closeConversationTool, retrieveClientTool };
