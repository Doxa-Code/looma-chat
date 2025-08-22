import { Conversation } from "../../domain/entities/conversation";
import { NotFound } from "../../domain/errors/not-found";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

export class CloseConversation {
  constructor(
    private readonly conversationsRepository: ConversationsRepository
  ) {}

  async execute(input: InputDTO) {
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

type InputDTO = {
  conversationId: string;
  workspaceId: string;
};
