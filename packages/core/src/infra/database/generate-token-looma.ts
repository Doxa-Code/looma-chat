import "dotenv/config";
import { UsersDatabaseRepository } from "../../infra/repositories/users-repository";
import { JWTTokenDriver } from "../../infra/drivers/token-driver";

const usersRepository = UsersDatabaseRepository.instance();
const tokenDriver = JWTTokenDriver.instance();

(async () => {
  const loomaUser = await usersRepository.retrieveUserByEmail(
    "looma@doxacode.com.br"
  );
  if (!loomaUser) {
    process.exit(0);
  }
  const token = await tokenDriver.create(loomaUser.id);
  console.log(`Token Looma Criado: ${token}`);
  process.exit(0);
})();
