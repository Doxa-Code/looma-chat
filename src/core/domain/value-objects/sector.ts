import { InvalidCreation } from "../errors/invalid-creation";

export interface SectorRaw {
  id: string;
  name: string;
}

export class Sector {
  constructor(readonly id: string, readonly name: string) {}
  raw() {
    return {
      id: this.id,
      name: this.name,
    };
  }
  static create(name: string, id?: string) {
    if (!name) throw InvalidCreation.throw();
    return new Sector(id ?? crypto.randomUUID().toString(), name);
  }
}
