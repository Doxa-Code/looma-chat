import { Attendant } from "../value-objects/attendant";
import { Contact } from "../value-objects/contact";
import { Sender, SenderRaw } from "../value-objects/sender";

export namespace Message {
  export type Type = "text" | "audio" | "image";
  export type Status = "senting" | "sent" | "delivered" | "viewed";

  export interface Raw {
    id: string;
    type: Type;
    content: string;
    sender: SenderRaw;
    internal: boolean;
    createdAt: Date;
    viewedAt: Date | null;
    status: Status;
  }

  export interface CreateProps {
    id: string;
    type: Type;
    content: string;
    sender: Attendant | Contact;
    createdAt: Date;
    internal?: boolean;
  }

  export interface Props {
    id: string;
    type: Type;
    content: string;
    sender: Sender;
    internal: boolean;
    createdAt: Date;
    viewedAt: Date | null;
    status: Status;
  }
}

export class Message {
  public readonly id: string;
  public readonly type: Message.Type;
  public readonly content: string;
  public readonly sender: Sender;
  public readonly createdAt: Date;
  public viewedAt: Date | null;
  public internal: boolean;
  public status: Message.Status;

  constructor(props: Message.Props) {
    this.id = props.id;
    this.type = props.type;
    this.content = props.content;
    this.sender = props.sender;
    this.createdAt = props.createdAt;
    this.viewedAt = props.viewedAt;
    this.internal = props.internal;
    this.status = props.status;
  }

  markAsViewed() {
    this.status = "viewed";
    this.viewedAt = new Date();
  }

  markAsSent() {
    this.status = "sent";
  }

  markAsDelivered() {
    this.status = "delivered";
  }

  raw(): Message.Raw {
    return {
      content: this.content,
      createdAt: this.createdAt,
      id: this.id,
      internal: this.internal,
      sender: this.sender.raw(),
      type: this.type,
      viewedAt: this.viewedAt,
      status: this.status,
    };
  }

  static instance(props: Message.Props) {
    return new Message(props);
  }

  static create(props: Message.CreateProps) {
    return new Message({
      content: props.content,
      createdAt: props.createdAt,
      id: props.id,
      sender: Sender.create(
        props.sender instanceof Attendant ? "attendant" : "contact",
        props.sender instanceof Attendant
          ? props.sender.id
          : props.sender.phone,
        props.sender.name
      ),
      type: props.type,
      viewedAt: null,
      internal: props.internal ?? false,
      status: "senting",
    });
  }
}
