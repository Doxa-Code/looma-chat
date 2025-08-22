import { Cart } from "../../domain/entities/cart";
import { Conversation } from "../../domain/entities/conversation";
import { Membership } from "../../domain/entities/membership";
import { User } from "../../domain/entities/user";
import { Attendant } from "../../domain/value-objects/attendant";
import { Contact } from "../../domain/value-objects/contact";
import { Setting } from "../../domain/value-objects/setting";
import { LoomaAIDriver } from "../../infra/drivers/ai-driver";
import { MetaMessageDriver } from "../../infra/drivers/message-driver";
import { CartsDatabaseRepository } from "../../infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { MembershipsDatabaseRepository } from "../../infra/repositories/membership-repository";
import { SettingsDatabaseRepository } from "../../infra/repositories/settings-repository";
import { UsersDatabaseRepository } from "../../infra/repositories/users-repository";
import { SendMessage } from "./send-message";

interface SettingsRepository {
  retrieveSettingsByWorkspaceId(workspaceId: string): Promise<Setting | null>;
}

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface UsersRepository {
  retrieveUserByEmail(email: string): Promise<User | null>;
  upsert(user: User): Promise<void>;
}

interface MembershipsRepository {
  retrieveByUserIdAndWorkspaceId(
    userId: string,
    workspaceId: string
  ): Promise<Membership | null>;
  upsert(membership: Membership): Promise<void>;
}

interface CartsRepository {
  retrieveLastCartByContactPhone(
    phone: string,
    workspaceId: string
  ): Promise<Cart | null>;
  retrieveOpenCartByConversationId(
    phone: string,
    workspaceId: string
  ): Promise<Cart | null>;
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

type SendMessageProps = {
  aiUser: User;
  workspaceId: string;
  lastCart: Cart | null;
  currentCart: Cart | null;
  contact: Contact;
  conversationId: string;
  content: string;
  settings: Setting;
};

type TranscriptAudioProps = {
  audio: ArrayBuffer;
};

type AnalyzerImageProps = {
  image: ArrayBuffer;
};

interface AIDriver {
  sendMessage(props: SendMessageProps): Promise<string>;
  transcriptAudio(props: TranscriptAudioProps): Promise<string>;
  analyzerImage(props: AnalyzerImageProps): Promise<string>;
}

export class SendMessageToLooma {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly cartsRepository: CartsRepository,
    private readonly messageDriver: MessageDriver,
    private readonly aiDriver: AIDriver
  ) {}

  async execute(input: InputDTO) {
    const settings =
      await this.settingsRepository.retrieveSettingsByWorkspaceId(
        input.workspaceId
      );

    if (!settings || !settings.aiEnabled) return;

    let conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    const messages = conversation.lastContactMessages.map((m) => m.content);

    if (!messages.length) return;

    let loomaUser = await this.usersRepository.retrieveUserByEmail(
      "looma@doxacode.com.br"
    );

    if (!loomaUser) {
      loomaUser = User.create({
        email: "looma@doxacode.com.br",
        name: "Looma AI",
        type: "system",
      });
      await this.usersRepository.upsert(loomaUser);
    }

    let membership =
      await this.membershipsRepository.retrieveByUserIdAndWorkspaceId(
        loomaUser.id,
        input.workspaceId
      );

    if (!membership) {
      membership = Membership.create(input.workspaceId, loomaUser.id);
      membership.setPermissions(["manage:carts", "view:products"]);
      await this.membershipsRepository.upsert(membership);
    }

    const [lastCart, currentCart] = await Promise.all([
      this.cartsRepository.retrieveLastCartByContactPhone(
        conversation.contact.phone,
        input.workspaceId
      ),
      this.cartsRepository.retrieveOpenCartByConversationId(
        conversation.id,
        input.workspaceId
      ),
    ]);

    let content = "";

    for (const message of conversation.lastContactMessages) {
      if (message?.type === "audio") {
        const { success, content: arrayBuffer } =
          await this.messageDriver.downloadMedia(
            conversation.channel,
            message.content
          );
        if (!success) continue;
        const transcript = await this.aiDriver.transcriptAudio({
          audio: arrayBuffer,
        });
        content += `${transcript}\n`;
        continue;
      }

      if (message?.type === "image") {
        const { success, content: arrayBuffer } =
          await this.messageDriver.downloadMedia(
            conversation.channel,
            message.content
          );
        if (!success) continue;
        const transcript = await this.aiDriver.analyzerImage({
          image: arrayBuffer,
        });
        content += `${transcript}\n`;
        continue;
      }
      content += message.content;
    }

    if (!conversation.attendant) {
      conversation.attributeAttendant(
        Attendant.create(loomaUser.id, loomaUser.name)
      );
      await this.conversationsRepository.upsert(
        conversation,
        input.workspaceId
      );
    }

    await this.messageDriver.sendTyping({
      lastMessageId: conversation.lastContactMessages.at(-1)?.id!,
      channel: conversation.channel,
    });

    const response = await this.aiDriver.sendMessage({
      aiUser: loomaUser,
      workspaceId: input.workspaceId,
      lastCart,
      currentCart,
      contact: conversation.contact,
      conversationId: conversation.id,
      content,
      settings,
    });

    conversation = await SendMessage.instance().execute({
      content: response,
      conversationId: conversation.id,
      userId: loomaUser.id,
      userName: loomaUser.name,
      workspaceId: input.workspaceId,
    });

    return conversation;
  }

  static instance() {
    return new SendMessageToLooma(
      SettingsDatabaseRepository.instance(),
      ConversationsDatabaseRepository.instance(),
      UsersDatabaseRepository.instance(),
      MembershipsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      MetaMessageDriver.instance(),
      LoomaAIDriver.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  workspaceId: string;
};
