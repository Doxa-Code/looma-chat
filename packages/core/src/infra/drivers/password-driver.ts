import bcrypt from "bcrypt";

export interface PasswordDriver {
  compare(password: string, hash: string): boolean;
}

export class BcryptPasswordDriver implements PasswordDriver {
  compare(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  static instance() {
    return new BcryptPasswordDriver();
  }
}
