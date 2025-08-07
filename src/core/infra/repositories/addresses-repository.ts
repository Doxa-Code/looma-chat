import { createConnection } from "../database";
import { addresses } from "../database/schemas";
import { Address } from "@/core/domain/value-objects/address";

export class AddressRepository {
  async upsertAddress(address: Address): Promise<boolean> {
    const db = createConnection();

    const savedAddress = await db
      .insert(addresses)
      .values(address)
      .onConflictDoUpdate({
        target: addresses.id,
        set: address
      })
      .returning()

    await db.$client.end();

    return savedAddress.length > 0;
  }

  static instance() {
    return new AddressRepository();
  }
}

