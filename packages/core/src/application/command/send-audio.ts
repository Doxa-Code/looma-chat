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

type SendMessageAudioProps = {
  channel: string;
  to: string;
  file: File;
};

type TypingProps = {
  lastMessageId: string;
  channel: string;
};

interface MessageDriver {
  sendMessageAudio(data: SendMessageAudioProps): Promise<{
    id: string;
    mediaId: string;
  }>;
  sendTyping(data: TypingProps): Promise<void>;
  downloadMedia(
    channel: string,
    mediaId: string
  ): Promise<
    { success: true; content: ArrayBuffer } | { success: false; content: Error }
  >;
}

export class SendAudio {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messageDriver: MessageDriver
  ) {}
  async execute(input: InputDTO): Promise<Conversation> {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.throw("Conversation");

    await this.messageDriver.sendTyping({
      lastMessageId: conversation.lastContactMessages?.at(-1)?.id!,
      channel: conversation.channel,
    });

    const attendant = Attendant.create(input.userId, input.userName);

    if (!conversation.attendant) {
      conversation.attributeAttendant(attendant);
    }

    const { id: messageId, mediaId } =
      await this.messageDriver.sendMessageAudio({
        channel: conversation.channel,
        to: conversation.contact.phone,
        file: input.file,
      });

    conversation.addMessage(
      Message.create({
        content: mediaId,
        createdAt: new Date(),
        id: messageId,
        sender: attendant,
        type: "audio",
      })
    );

    await this.conversationsRepository.upsert(conversation, input.workspaceId);

    return conversation;
  }

  static instance() {
    return new SendAudio(
      ConversationsDatabaseRepository.instance(),
      MetaMessageDriver.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  userId: string;
  userName: string;
  file: File;
  workspaceId: string;
};
