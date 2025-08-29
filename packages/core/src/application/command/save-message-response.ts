import { Conversation } from "../../domain/entities/conversation";
import { Message } from "../../domain/entities/message";
import { NotFound } from "../../domain/errors/not-found";
import { Attendant } from "../../domain/value-objects/attendant";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

export class SaveMessageResponse {
  constructor(
    private readonly conversationsRepository: ConversationsRepository
  ) {}
  async execute(input: InputDTO): Promise<void> {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.throw("Conversation");

    const attendant = Attendant.create(input.userId, input.userName);

    if (!conversation.attendant) {
      conversation.attributeAttendant(attendant);
    }

    const message = Message.create({
      content: input.content,
      createdAt: new Date(),
      id: input.messageId,
      sender: attendant,
      type: "text",
    });

    conversation.addMessage(message);

    await this.conversationsRepository.upsert(conversation, input.workspaceId);
  }

  static instance() {
    return new SaveMessageResponse(ConversationsDatabaseRepository.instance());
  }
}

type InputDTO = {
  conversationId: string;
  userId: string;
  userName: string;
  content: string;
  workspaceId: string;
  messageId: string;
};
