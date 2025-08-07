import { Contact } from "@/core/domain/value-objects/contact";
import { eq } from "drizzle-orm";
import { createConnection } from "../database";
import { contacts } from "../database/schemas";

export class ContactsRepository {
  async retrieve(phone: string) {
    const db = createConnection();
    const response = await db
      .select({
        phone: contacts.phone,
        name: contacts.name,
      })
      .from(contacts)
      .where(eq(contacts.phone, phone));
    await db.$client.end();
    const contact = response?.[0];
    if (!contact) return null;
    return Contact.create(contact.phone, contact.name);
  }
  async upsert(contact: Contact) {
    const db = createConnection();
    await db
      .insert(contacts)
      .values({
        name: contact.name,
        phone: contact.phone,
      })
      .onConflictDoUpdate({
        set: {
          name: contact.name,
          phone: contact.phone,
        },
        target: contacts.phone,
      });
    await db.$client.end();
  }
  static instance() {
    return new ContactsRepository();
  }
}
