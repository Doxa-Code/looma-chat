import { createDatabaseConnection } from "../database";
import { addresses } from "../database/schemas";
import { Address } from "../../domain/value-objects/address";

export class AddressesDatabaseRepository {
  async upsertAddress(address: Address): Promise<boolean> {
    const db = createDatabaseConnection();

    const savedAddress = await db
      .insert(addresses)
      .values(address)
      .onConflictDoUpdate({
        target: addresses.id,
        set: address,
      })
      .returning();

    return savedAddress.length > 0;
  }

  static instance() {
    return new AddressesDatabaseRepository();
  }
}
