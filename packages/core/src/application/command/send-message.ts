import { Conversation } from "../../domain/entities/conversation";
import { Message } from "../../domain/entities/message";
import { NotFound } from "../../domain/errors/not-found";
import { Attendant } from "../../domain/value-objects/attendant";
import { MetaMessageDriver } from "../../infra/drivers/message-driver";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

type SendMessageTextProps = {
  channel: string;
  to: string;
  content: string;
};

type TypingProps = {
  lastMessageId: string;
  channel: string;
};

interface MessageDriver {
  sendMessageText(data: SendMessageTextProps): Promise<string | null>;
  sendTyping(data: TypingProps): Promise<void>;
  downloadMedia(
    channel: string,
    mediaId: string
  ): Promise<
    { success: true; content: ArrayBuffer } | { success: false; content: Error }
  >;
}

export class SendMessage {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messageDriver: MessageDriver
  ) {}
  async execute(input: InputDTO): Promise<Conversation | null> {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.throw("Conversation");

    await this.messageDriver.sendTyping({
      lastMessageId: conversation.lastContactMessages.at(-1)?.id!,
      channel: conversation.channel,
    });

    const attendant = Attendant.create(input.userId, input.userName);

    if (!conversation.attendant) {
      conversation.attributeAttendant(attendant);
    }

    const messageId = await this.messageDriver.sendMessageText({
      channel: conversation.channel,
      content: input.content,
      to: conversation.contact.phone,
    });

    if (!messageId) return null;

    const message = Message.create({
      content: input.content,
      createdAt: new Date(),
      id: messageId,
      sender: attendant,
      type: "text",
    });

    conversation.addMessage(message);

    await this.conversationsRepository.upsert(conversation, input.workspaceId);
    return conversation;
  }

  static instance() {
    return new SendMessage(
      ConversationsDatabaseRepository.instance(),
      MetaMessageDriver.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  userId: string;
  userName: string;
  content: string;
  workspaceId: string;
};
