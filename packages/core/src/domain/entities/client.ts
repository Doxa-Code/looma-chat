import { Address } from "../value-objects/address";
import { Contact } from "../value-objects/contact";

export namespace Client {
  export interface Props {
    id: string;
    contact: Contact;
    address: Address | null;
  }

  export interface Raw {
    id: string;
    contact: {
      phone: string;
      name: string;
    };
    address: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      note: string | null;
    } | null;
  }
}

export class Client {
  public id: string;
  public contact: Contact;
  public address: Address | null;

  constructor(props: Client.Props) {
    this.id = props.id;
    this.contact = props.contact;
    this.address = props.address;
  }

  raw(): Client.Raw {
    return {
      id: this.id,
      contact: this.contact.raw(),
      address: this.address?.raw?.() ?? null,
    };
  }

  setAddress(address: Address) {
    this.address = address;
  }

  static instance(props: Client.Raw) {
    return new Client({
      address: props.address ? Address.create(props.address) : null,
      contact: Contact.create(props.contact.phone, props.contact.name),
      id: props.id,
    });
  }

  static create(contact: Contact) {
    return new Client({
      address: null,
      contact,
      id: crypto.randomUUID().toString(),
    });
  }
}
