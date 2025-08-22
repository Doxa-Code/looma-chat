import { Contact } from "../../domain/value-objects/contact";
import { eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { contacts } from "../database/schemas";

export class ContactsDatabaseRepository {
  async retrieve(phone: string) {
    const db = createDatabaseConnection();
    const response = await db
      .select({
        phone: contacts.phone,
        name: contacts.name,
      })
      .from(contacts)
      .where(eq(contacts.phone, phone));

    const contact = response?.[0];
    if (!contact) return null;
    return Contact.create(contact.phone, contact.name);
  }
  async upsert(contact: Contact) {
    const db = createDatabaseConnection();
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
  }
  static instance() {
    return new ContactsDatabaseRepository();
  }
}
