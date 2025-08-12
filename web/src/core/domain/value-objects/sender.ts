import { InvalidCreation } from "../errors/invalid-creation";

export type SenderType = "attendant" | "contact";
export type SenderRaw = {
  type: SenderType;
  id: string;
  name: string;
};

export class Sender {
  constructor(
    readonly type: SenderType,
    readonly id: string,
    readonly name: string
  ) {}
  raw(): SenderRaw {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
    };
  }
  static create(type: SenderType, id: string, name: string) {
    if (!id || !name) throw InvalidCreation.throw();
    return new Sender(type ?? "attendant", id, name);
  }
}
