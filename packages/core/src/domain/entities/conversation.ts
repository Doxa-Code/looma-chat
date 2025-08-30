import { InvalidCreation } from "../errors/invalid-creation";
import { Attendant, AttendantRaw } from "../value-objects/attendant";
import { Contact, ContactRaw } from "../value-objects/contact";
import { Sector, SectorRaw } from "../value-objects/sector";
import { Message } from "./message";

export namespace Conversation {
  export type Status = "waiting" | "open" | "closed" | "expired";
  export interface Props {
    id: string;
    contact: Contact;
    messages: Message[];
    attendant: Attendant | null;
    status: Status;
    openedAt: Date | null;
    closedAt: Date | null;
    sector: Sector | null;
    channel: string;
  }

  export interface Raw {
    id: string;
    contact: ContactRaw;
    messages: Message.Raw[];
    attendant: AttendantRaw | null;
    status: Status;
    openedAt: Date | null;
    closedAt: Date | null;
    sector: SectorRaw | null;
    channel: string;
    lastMessage?: Message.Raw;
    teaser?: string;
    lastContactMessages: Message.Raw[];
  }
}

export class Conversation {
  public id: string;
  public contact: Contact;
  private _messages: Map<string, Message>;
  public attendant: Attendant | null;
  public status: Conversation.Status;
  public openedAt: Date | null;
  public closedAt: Date | null;
  public sector: Sector | null;
  public channel: string;

  constructor(props: Conversation.Props) {
    this.id = props.id;
    this.contact = props.contact;
    this.messages = props.messages;
    this.attendant = props.attendant;
    this.status = props.status;
    this.openedAt = props.openedAt;
    this.sector = props.sector;
    this.channel = props.channel;
    this.closedAt = props.closedAt;
  }

  raw(): Conversation.Raw {
    return {
      attendant: this.attendant?.raw?.() ?? null,
      channel: this.channel,
      contact: this.contact.raw(),
      id: this.id,
      messages: this.messages.map((message) => message.raw()),
      openedAt: this.openedAt,
      sector: this.sector?.raw?.() ?? null,
      status: this.status,
      lastMessage: this.lastMessage?.raw?.(),
      teaser: this.teaser,
      closedAt: this.closedAt,
      lastContactMessages: this.lastContactMessages.map((m) => m.raw()),
    };
  }

  set messages(messages: Message[]) {
    if (!this._messages) {
      this._messages = new Map();
    }
    for (const message of messages) {
      this._messages.set(message.id, message);
    }
  }

  get messages() {
    return Array.from(this._messages.values()).sort((a, b) =>
      a.createdAt > b.createdAt ? 1 : -1
    );
  }

  get lastMessage() {
    return this.messages.at(-1);
  }

  get lastContactMessages() {
    const messages: Message[] = [];
    for (const message of this.messages.reverse()) {
      if (message.sender?.type === "attendant") return messages.reverse();
      messages.push(message);
    }
    return messages.reverse();
  }

  get teaser() {
    return this.messages.at(-1)?.type === "audio"
      ? "Audio"
      : this.messages.at(-1)?.type === "image"
        ? "Imagem"
        : this.messages.at(-1)?.content;
  }

  setChannel(channel: string) {
    this.channel = channel;
  }

  addMessage(message: Message) {
    this._messages.set(message.id, message);

    if (this.status === "waiting" && message.sender?.type === "attendant") {
      this.attributeAttendant(
        Attendant.create(message.sender.id, message.sender.name)
      );
      this.markLastMessagesAsViewed();
    }
  }

  private markLastMessagesAsViewed() {
    const messages = this.messages.filter((m) => m.status !== "viewed");
    for (const message of messages) {
      message.markAsViewed();
      this._messages.set(message.id, message);
    }
  }

  markLastMessagesContactAsViewed() {
    const messages = this.messages.filter(
      (m) => m.status !== "viewed" && m.sender?.type === "contact"
    );
    for (const message of messages) {
      message.markAsViewed();
      this._messages.set(message.id, message);
    }
  }

  openConversation(attendantId: string) {
    if (this.attendant?.id !== attendantId) return;
    this.markLastMessagesAsViewed();
  }

  openService() {
    this.status = "open";
    this.openedAt = new Date();
  }

  attributeAttendant(attendant: Attendant) {
    if (!this.attendant && this.status === "waiting") {
      this.openService();
    }
    this.attendant = attendant;
  }

  transferToSector(sector: Sector) {
    this.sector = sector;
  }

  transferToAttendant(attendant: Attendant) {
    this.attendant = attendant;
  }

  close() {
    this.status = "closed";
    this.closedAt = new Date();
  }

  static instance(props: Conversation.Props) {
    return new Conversation(props);
  }

  static create(contact: Contact, channel: string) {
    if (!contact) throw InvalidCreation.throw();
    return new Conversation({
      id: crypto.randomUUID().toString(),
      contact,
      messages: [],
      attendant: null,
      status: "waiting",
      openedAt: null,
      sector: null,
      channel,
      closedAt: null,
    });
  }
}
