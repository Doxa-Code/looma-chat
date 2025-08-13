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

  setAddress(address: Address) {
    this.address = address;
  }

  static instance(props: Client.Props) {
    return new Client(props);
  }

  static create(contact: Contact) {
    return new Client({
      address: null,
      contact,
      id: crypto.randomUUID().toString(),
    });
  }
}
