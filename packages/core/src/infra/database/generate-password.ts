import "dotenv/config";
import { UsersDatabaseRepository } from "../../infra/repositories/users-repository";
import { BcryptPasswordDriver } from "../drivers/password-driver";

const usersRepository = UsersDatabaseRepository.instance();
const payload = {
  email: process.argv[2],
  password: process.argv[3],
};

(async () => {
  if (!payload.email || !payload.password) {
    console.log("Falta email e senha");
    return;
  }
  const user = await usersRepository.retrieveUserByEmail(payload.email);
  if (!user) {
    process.exit(0);
  }
  const passwordHashed = BcryptPasswordDriver.instance().create(
    payload.password
  );
  await usersRepository.setPassword(user.id, passwordHashed);
  console.log(`Senha para o usuário ${payload.email} criada`);
  process.exit(0);
})();
