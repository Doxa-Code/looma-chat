import { Conversation } from "../../domain/entities/conversation";
import { Message } from "../../domain/entities/message";
import { Contact } from "../../domain/value-objects/contact";
import { ContactsDatabaseRepository } from "../../infra/repositories/contacts-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieveByContactPhone(
    phone: string,
    channel: string
  ): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface ContactsRepository {
  retrieve(phone: string): Promise<Contact | null>;
  upsert(contact: Contact): Promise<void>;
}

export class MessageReceived {
  constructor(
    private readonly contactsRepository: ContactsRepository,
    private readonly conversationsRepository: ConversationsRepository
  ) {}
  async execute(input: InputDTO) {
    let [contact, conversation] = await Promise.all([
      this.contactsRepository.retrieve(input.contactPhone),
      this.conversationsRepository.retrieveByContactPhone(
        input.contactPhone,
        input.channel
      ),
    ]);

    if (!contact) {
      contact = Contact.create(input.contactPhone, input.contactName);
      await this.contactsRepository.upsert(contact);
    }

    if (!conversation) {
      conversation = Conversation.create(contact, input.channel);
    }

    const message = Message.create({
      content: input.messagePayload?.content,
      id: input.messagePayload?.id,
      createdAt: new Date(input.messagePayload?.timestamp * 1000),
      sender: contact,
      type: input.messagePayload?.type,
    });

    if (conversation.messages.some((m) => m.id === message.id)) return;

    message.markAsDelivered();
    conversation.addMessage(message);

    await this.conversationsRepository.upsert(conversation, input.workspaceId);

    return { conversation, workspaceId: input.workspaceId };
  }

  static instance() {
    return new MessageReceived(
      ContactsDatabaseRepository.instance(),
      ConversationsDatabaseRepository.instance()
    );
  }
}

export type MessagePayload = {
  id: string;
  type: "text" | "audio" | "image";
  timestamp: number;
  content: string;
};

type InputDTO = {
  channel: string;
  contactPhone: string;
  contactName: string;
  messagePayload: MessagePayload;
  workspaceId: string;
};
