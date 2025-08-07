import { InvalidCreation } from "../errors/invalid-creation";

export type AttendantRaw = {
  id: string;
  name: string;
};

export class Attendant {
  constructor(readonly id: string, readonly name: string) {}
  raw(): AttendantRaw {
    return {
      id: this.id,
      name: this.name,
    };
  }
  static create(id: string, name: string) {
    if (!id || !name) throw InvalidCreation.throw();
    return new Attendant(id, name);
  }
}
