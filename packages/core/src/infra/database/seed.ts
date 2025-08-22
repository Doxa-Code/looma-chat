import { Membership } from "../../domain/entities/membership";
import { User } from "../../domain/entities/user";
import { Sector } from "../../domain/value-objects/sector";
import { Workspace } from "../../domain/value-objects/workspace";
import bcrypt from "bcrypt";
import "dotenv/config";
import { MembershipsDatabaseRepository } from "../repositories/membership-repository";
import { SectorsDatabaseRepository } from "../repositories/sectors-respository";
import { UsersDatabaseRepository } from "../repositories/users-repository";
import { WorkspacesRepository } from "../repositories/workspaces-repository";

const USER_DATA = {
  name: "Fernando Souza",
  email: "fernando.souza@doxacode.com.br",
  password: bcrypt.hashSync("50271541", 10),
  thumbnail: null,
  type: "superuser" as const,
};

const sectorRepository = SectorsDatabaseRepository.instance();
const usersRepository = UsersDatabaseRepository.instance();
const workspacesRepository = WorkspacesRepository.instance();
const membershipsRepository = MembershipsDatabaseRepository.instance();

(async () => {
  // TODO: RESOLVER
  const user = await usersRepository.retrieveUserByEmail(USER_DATA.email);

  if (!user?.id) {
    const sector = Sector.create("Geral");
    const user = User.create({
      email: USER_DATA.email,
      name: USER_DATA.name,
      type: "superuser",
    });
    user.assignSector(sector);
    const workspace = Workspace.create("Doxa Code");
    await workspacesRepository.upsert(workspace);
    await sectorRepository.upsert(workspace.id, sector);
    const membership = Membership.create(workspace.id, user.id);
    await usersRepository.upsert(user);
    await membershipsRepository.upsert(membership);
    await usersRepository.setPassword(user.id, bcrypt.hashSync("50271541", 10));
    console.log("Usuário criado com sucesso");
    process.exit(0);
  }

  console.log("Usuário já existe");
  process.exit(0);
})();
