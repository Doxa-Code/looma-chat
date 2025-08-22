import { Client } from "../../domain/entities/client";
import { NotFound } from "../../domain/errors/not-found";
import { Address, AddressRaw } from "../../domain/value-objects/address";
import { AddressesDatabaseRepository } from "../../infra/repositories/addresses-repository";
import { ClientsDatabaseRepository } from "../../infra/repositories/clients-repository";

interface ClientsRepository {
  retrieveByPhone(phone: string, workspaceId: string): Promise<Client | null>;
}

interface AddressesRepository {
  upsertAddress(address: Address): Promise<boolean>;
}

export class ChangeClientAddress {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly addressesRepository: AddressesRepository
  ) {}
  async execute(input: InputDTO) {
    const client = await this.clientsRepository.retrieveByPhone(
      input.phone,
      input.workspaceId
    );

    if (!client) throw NotFound.throw("Client");

    const newAddress = Address.create({
      id: client.address?.id,
      ...input.address,
    });

    await this.addressesRepository.upsertAddress(newAddress);
  }

  static instance() {
    return new ChangeClientAddress(
      ClientsDatabaseRepository.instance(),
      AddressesDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  workspaceId: string;
  phone: string;
  address: AddressRaw;
};
