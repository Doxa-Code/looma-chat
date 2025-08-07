import { InvalidCreation } from "../errors/invalid-creation";

export type ContactRaw = {
  phone: string;
  name: string;
  thumbnail?: string | null;
};

export class Contact {
  constructor(
    readonly phone: string,
    readonly name: string,
    readonly thumbnail?: string | null
  ) {}

  raw(): ContactRaw {
    return {
      name: this.name,
      phone: this.phone,
      thumbnail: this.thumbnail,
    };
  }

  static create(phone: string, name?: string) {
    if (!phone) throw InvalidCreation.throw();
    return new Contact(phone, name ?? phone, "");
  }
}
