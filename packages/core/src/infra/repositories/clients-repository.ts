import { Client } from "@looma/core/domain/entities/client";
import { createDatabaseConnection } from "../database";
import { addresses, clients, contacts } from "../database/schemas";
import { eq } from "drizzle-orm";
import { Address } from "@looma/core/domain/value-objects/address";
import { Contact } from "@looma/core/domain/value-objects/contact";

export class ClientsRepository {
  async retrieveByPhone(phone: string): Promise<Client | null> {
    const db = createDatabaseConnection();
    const [client] = await db
      .select({
        id: clients.id,
        contact: {
          phone: contacts.phone,
          name: contacts.name,
        },
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
      })
      .from(clients)
      .innerJoin(contacts, eq(contacts.phone, clients.contactPhone))
      .leftJoin(addresses, eq(addresses.id, clients.addressId))
      .where(eq(clients.contactPhone, phone));

    if (!client) return null;

    return Client.instance({
      id: client.id,
      address: client.address ? Address.create(client.address) : null,
      contact: Contact.create(client.contact.phone, client.contact.name),
    });
  }

  async upsert(input: Client, workspaceId: string, partnerId?: string) {
    const db = createDatabaseConnection();

    const client = partnerId
      ? ((
          await db
            .select({ id: clients.id, address: addresses, contact: contacts })
            .from(clients)
            .innerJoin(contacts, eq(contacts.phone, clients.contactPhone))
            .leftJoin(addresses, eq(addresses.id, clients.addressId))
            .where(eq(clients.partnerId, partnerId))
        )?.[0] ?? input)
      : input;

    const [address] = await db
      .select({ addressId: clients.addressId })
      .from(clients)
      .where(eq(clients.id, client.id));

    await db.transaction(async (tx) => {
      const [addressCreated] = await tx
        .insert(addresses)
        .values({
          id: address?.addressId ?? crypto.randomUUID().toString(),
          city: client.address?.city ?? "",
          neighborhood: client.address?.neighborhood ?? "",
          number: client.address?.number ?? "",
          state: client.address?.state ?? "",
          street: client.address?.street ?? "",
          zipCode: client.address?.zipCode ?? "",
          note: client.address?.note ?? "",
          country: client.address?.country ?? "",
        })
        .onConflictDoUpdate({
          set: {
            city: client.address?.city ?? "",
            neighborhood: client.address?.neighborhood ?? "",
            number: client.address?.number ?? "",
            state: client.address?.state ?? "",
            street: client.address?.street ?? "",
            zipCode: client.address?.zipCode ?? "",
            note: client.address?.note ?? "",
            country: client.address?.country ?? "",
          },
          target: addresses.id,
        })
        .returning();

      const contactCreated = await tx
        .insert(contacts)
        .values({
          name: client.contact.name,
          phone: client.contact.phone,
        })
        .onConflictDoUpdate({
          set: {
            name: client.contact.name,
          },
          target: contacts.phone,
        })
        .returning();

      await tx
        .insert(clients)
        .values({
          id: client.id,
          addressId: addressCreated?.id,
          contactPhone: contactCreated?.[0]?.phone,
          partnerId,
          workspaceId,
        })
        .onConflictDoUpdate({
          set: {
            addressId: addressCreated?.id,
            contactPhone: contactCreated?.[0]?.phone,
            workspaceId,
          },
          target: clients.id,
        })
        .returning();
    });

    return;
  }

  static instance() {
    return new ClientsRepository();
  }
}
