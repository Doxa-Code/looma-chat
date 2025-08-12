export class NotAuthorized extends Error {
  constructor() {
    super("Sem autorização");
    this.name = "NotAuthorized";
  }

  static throw() {
    return new NotAuthorized();
  }
}
