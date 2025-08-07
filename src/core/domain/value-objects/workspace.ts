export class Workspace {
  constructor(readonly id: string, readonly name: string) {}
  static create(name: string, id?: string) {
    return new Workspace(
      !!id ? id : crypto.randomUUID().toString(),
      name ?? ""
    );
  }
}
