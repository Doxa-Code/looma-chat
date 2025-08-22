import { User } from "@looma/core/domain/entities/user";
import { NotAuthorized } from "@looma/core/domain/errors/not-authorized";
import { NotFound } from "@looma/core/domain/errors/not-found";
import {
  AuthorizationService,
  PolicyName,
} from "@looma/core/domain/services/authorization-service";
import { MembershipsDatabaseRepository } from "@looma/core/infra/repositories/membership-repository";
import { UsersDatabaseRepository } from "@looma/core/infra/repositories/users-repository";
import z from "zod";
import { createServerActionProcedure } from "zsa";
import { getUserAuthenticate, getWorkspaceSelected } from "./security";

const authorizationService = AuthorizationService.instance();
const membershipsRepository = MembershipsDatabaseRepository.instance();
const usersRepository = UsersDatabaseRepository.instance();

export const securityProcedure = (permissions?: PolicyName[]) =>
  createServerActionProcedure()
    .handler(async ({ input }) => {
      let user: User | null;
      let workspaceId: string | null;

      const [userAuth] = await getUserAuthenticate();
      user = userAuth;
      workspaceId = await getWorkspaceSelected();

      if (!user || !workspaceId) throw NotAuthorized.throw();

      const membership =
        await membershipsRepository.retrieveByUserIdAndWorkspaceId(
          user?.id,
          workspaceId
        );

      if (!membership?.id) throw NotFound.throw("workspace");

      const isAllowed = authorizationService.can(
        permissions!,
        user,
        membership
      );

      if (!isAllowed && !!permissions?.length) throw NotAuthorized.throw();

      return { user, membership };
    })
    .createServerAction();
