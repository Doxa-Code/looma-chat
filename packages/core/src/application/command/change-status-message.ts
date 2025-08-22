import { Conversation } from "../../domain/entities/conversation";
import { Message } from "../../domain/entities/message";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { MessagesDatabaseRepository } from "../../infra/repositories/messages-repository";

interface MessagesRepository {
  retrieve(id: string): Promise<Message | null>;
  upsert(message: Message): Promise<string | null>;
}

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
}

export class ChangeStatusMessage {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly conversationsRepository: ConversationsRepository
  ) {}
  async execute(input: InputDTO) {
    const message = await this.messagesRepository.retrieve(input.messageId);

    if (!message) return null;

    if (input.status === "sent") {
      message.markAsSent();
    }

    if (input.status === "delivered") {
      message.markAsDelivered();
    }

    if (input.status === "read") {
      message.markAsViewed();
    }

    const conversationId = await this.messagesRepository.upsert(message);

    if (conversationId) {
      const conversation =
        await this.conversationsRepository.retrieve(conversationId);
      if (!conversation) return null;
      return conversation;
    }

    return null;
  }

  static instance() {
    return new ChangeStatusMessage(
      MessagesDatabaseRepository.instance(),
      ConversationsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  messageId: string;
  status: string;
};
