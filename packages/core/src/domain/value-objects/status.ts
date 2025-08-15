import { InvalidCreation } from "../errors/invalid-creation";

export type StatusValue =
  | "expired"
  | "budget"
  | "order"
  | "cancelled"
  | "shipped"
  | "finished";

export class Status {
  static values = [
    "expired",
    "budget",
    "order",
    "cancelled",
    "shipped",
    "finished",
  ];
  constructor(readonly value: StatusValue) {}

  raw() {
    return this.value;
  }

  is(value: StatusValue) {
    return this.value === value;
  }

  get formatted() {
    const formatteds = new Map<StatusValue, string>([
      ["budget", "Em orçamento"],
      ["cancelled", "Pedido cancelado"],
      ["expired", "Pedido expirado"],
      ["finished", "Venda concluída"],
      ["shipped", "Pedido expedido"],
      ["order", "Pedido realizado"],
    ]);

    return formatteds.get(this.value) ?? "";
  }

  validate() {
    if (!Status.values.includes(this.value)) throw InvalidCreation.throw();
  }

  static create(value: StatusValue) {
    const instance = new Status(value);
    instance.validate();
    return instance;
  }
}
