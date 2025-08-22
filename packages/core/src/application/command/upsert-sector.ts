import { Sector } from "../../domain/value-objects/sector";
import { SectorsDatabaseRepository } from "../../infra/repositories/sectors-respository";

interface SectorsRepository {
  upsert(workspaceId: string, sector: Sector): Promise<void>;
}

export class UpsertSector {
  constructor(private readonly sectorsRepository: SectorsRepository) {}
  async execute(input: InputDTO) {
    const sector = Sector.create(input.name, input.id);
    await this.sectorsRepository.upsert(input.workspaceId, sector!);
  }

  static instance() {
    return new UpsertSector(SectorsDatabaseRepository.instance());
  }
}

type InputDTO = {
  id?: string;
  name: string;
  workspaceId: string;
};
