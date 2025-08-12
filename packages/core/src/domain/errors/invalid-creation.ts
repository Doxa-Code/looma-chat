export class InvalidCreation extends Error {
  constructor() {
    super("Criação inválida");
    this.name = "InvalidCreation";
  }

  static throw() {
    return new InvalidCreation();
  }
}
