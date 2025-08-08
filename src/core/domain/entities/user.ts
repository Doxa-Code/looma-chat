import { InvalidCreation } from "../errors/invalid-creation";
import { Sector, SectorRaw } from "../value-objects/sector";

export namespace User {
  export type Type = "system" | "user" | "superuser";
  export interface Props {
    id: string;
    name: string;
    email: string;
    thumbnail: string | null;
    sector: Sector | null;
    type: Type;
  }
  export interface CreateProps {
    name: string;
    email: string;
    type?: User.Type;
  }

  export interface Raw {
    id: string;
    name: string;
    email: string;
    thumbnail: string | null;
    sector: SectorRaw | null;
    type: User.Type;
  }
}

export class User {
  public id: string;
  public name: string;
  public email: string;
  public thumbnail: string | null;
  public sector: Sector | null;
  public type: User.Type;

  constructor(props: User.Props) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.thumbnail = props.thumbnail;
    this.sector = props.sector;
    this.type = props.type;
  }

  assignSector(sector: Sector | null) {
    this.sector = sector;
  }

  update(input: { email?: string; name?: string; type: User.Type }) {
    this.email = input.email ?? this.email;
    this.name = input.name ?? this.name;
    this.type = input?.type ?? this.type;
  }

  isSuperUser() {
    return this.type === "superuser";
  }

  raw(): User.Raw {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      thumbnail: this.thumbnail,
      sector: this.sector?.raw?.() ?? null,
      type: this.type,
    };
  }

  static instance(props: User.Props) {
    return new User(props);
  }

  static create(props: User.CreateProps) {
    if (!props.name || !props.email) throw InvalidCreation.throw();

    return new User({
      email: props.email,
      id: crypto.randomUUID().toString(),
      name: props.name,
      sector: null,
      thumbnail: null,
      type: props?.type ?? "user",
    });
  }
}
