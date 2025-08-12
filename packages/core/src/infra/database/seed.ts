import { Membership } from "@looma/core/domain/entities/membership";
import { User } from "@looma/core/domain/entities/user";
import { Sector } from "@looma/core/domain/value-objects/sector";
import { Workspace } from "@looma/core/domain/value-objects/workspace";
import bcrypt from "bcrypt";
import "dotenv/config";
import { MembershipsRepository } from "../repositories/membership-repository";
import { SectorsRepository } from "../repositories/sectors-respository";
import { UsersRepository } from "../repositories/users-repository";
import { WorkspacesRepository } from "../repositories/workspaces-repository";

const USER_DATA = {
  name: "Fernando Souza",
  email: "fernando.souza@doxacode.com.br",
  password: bcrypt.hashSync("50271541", 10),
  thumbnail: null,
  type: "superuser" as const,
};

const sectorRepository = SectorsRepository.instance();
const usersRepository = UsersRepository.instance();
const workspacesRepository = WorkspacesRepository.instance();
const membershipsRepository = MembershipsRepository.instance();

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
