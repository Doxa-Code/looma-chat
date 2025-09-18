import { Conversation } from "../../domain/entities/conversation";
import { User } from "../../domain/entities/user";
import { Attendant } from "../../domain/value-objects/attendant";
import { Sector } from "../../domain/value-objects/sector";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { SectorsDatabaseRepository } from "../../infra/repositories/sectors-respository";
import { UsersDatabaseRepository } from "../../infra/repositories/users-repository";

interface ConversationsRepository {
  retrieve(conversationId: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface SectorsRepository {
  retrieve(sectorId: string): Promise<Sector | null>;
}

interface UsersRepository {
  retrieve(userId: string): Promise<User | null>;
}

export class TransferConversation {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async execute(input: InputDTO) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    const sector = await this.sectorsRepository.retrieve(input.sectorId);

    if (!sector) return;

    conversation.transferToSector(Sector.create(sector.name, input.sectorId));

    if (input.attendantId) {
      const attendant = await this.usersRepository.retrieve(input.attendantId);

      if (!attendant) return;

      conversation.transferToAttendant(
        Attendant.create(input.attendantId, attendant.name)
      );
    }

    await this.conversationsRepository.upsert(conversation, input.workspaceId);

    return conversation;
  }

  static instance() {
    return new TransferConversation(
      ConversationsDatabaseRepository.instance(),
      SectorsDatabaseRepository.instance(),
      UsersDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  sectorId: string;
  workspaceId: string;
  attendantId?: string;
};
