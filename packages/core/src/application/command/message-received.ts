import { Conversation } from "../../domain/entities/conversation";
import { Message } from "../../domain/entities/message";
import { Contact } from "../../domain/value-objects/contact";
import { Setting } from "../../domain/value-objects/setting";
import { ContactsDatabaseRepository } from "../../infra/repositories/contacts-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { SettingsDatabaseRepository } from "../../infra/repositories/settings-repository";

interface ConversationsRepository {
  retrieveByContactPhone(
    phone: string,
    channel: string
  ): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface SettingsRepository {
  retrieveSettingByWabaIdAndPhoneId(
    wabaId: string,
    channel: string
  ): Promise<{ setting: Setting; workspaceId: string } | null>;
}

interface ContactsRepository {
  retrieve(phone: string): Promise<Contact | null>;
  upsert(contact: Contact): Promise<void>;
}

export class MessageReceived {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly conversationsRepository: ConversationsRepository
  ) {}
  async execute(input: InputDTO) {
    const responseSetting =
      await this.settingsRepository.retrieveSettingByWabaIdAndPhoneId(
        input.wabaId,
        input.channel
      );

    if (!responseSetting) return null;

    const workspaceId = responseSetting?.workspaceId;

    let contact = await this.contactsRepository.retrieve(input.contactPhone);

    if (!contact) {
      contact = Contact.create(input.contactPhone, input.contactName);
      await this.contactsRepository.upsert(contact);
    }

    let conversation =
      await this.conversationsRepository.retrieveByContactPhone(
        contact.phone,
        input.channel
      );

    if (!conversation) {
      conversation = Conversation.create(contact, input.channel);
    }

    for (const messagePayload of input.messagePayloads) {
      const message = Message.create({
        content: messagePayload.content,
        id: messagePayload.id,
        createdAt: new Date(messagePayload.timestamp * 1000),
        sender: contact,
        type: messagePayload.type,
      });

      if (conversation.messages.some((m) => m.id === message.id)) continue;

      message.markAsDelivered();

      conversation.addMessage(message);
    }

    await this.conversationsRepository.upsert(conversation, workspaceId);

    return { conversation, workspaceId };
  }

  static instance() {
    return new MessageReceived(
      SettingsDatabaseRepository.instance(),
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
  wabaId: string;
  channel: string;
  contactPhone: string;
  contactName: string;
  messagePayloads: MessagePayload[];
};
