import "dotenv/config";
import { UsersRepository } from "@/core/infra/repositories/users-repository";
import { JWTTokenDriver } from "@/core/infra/drivers/token-driver";

const usersRepository = UsersRepository.instance();
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
