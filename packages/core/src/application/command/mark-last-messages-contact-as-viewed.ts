import { Conversation } from "../../domain/entities/conversation";
import { NotFound } from "../../domain/errors/not-found";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieveByContactPhone(
    phone: string,
    channel: string
  ): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

export class MarkLastMessagesContactAsViewed {
  constructor(
    private readonly conversationsRepository: ConversationsRepository
  ) {}

  async execute(input: InputDTO) {
    const conversation =
      await this.conversationsRepository.retrieveByContactPhone(
        input.contactPhone,
        input.channel
      );

    if (!conversation) throw NotFound.throw("conversation");

    conversation.markLastMessagesContactAsViewed();

    await this.conversationsRepository.upsert(conversation, input.workspaceId);

    return conversation;
  }

  static instance() {
    return new MarkLastMessagesContactAsViewed(
      ConversationsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  contactPhone: string;
  channel: string;
  workspaceId: string;
};
