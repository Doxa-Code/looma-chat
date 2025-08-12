import { User } from "@/core/domain/entities/user";
import { NotAuthorized } from "@/core/domain/errors/not-authorized";
import { NotFound } from "@/core/domain/errors/not-found";
import {
  AuthorizationService,
  PolicyName,
} from "@/core/domain/services/authorization-service";
import { MembershipsRepository } from "@/core/infra/repositories/membership-repository";
import { UsersRepository } from "@/core/infra/repositories/users-repository";
import z from "zod";
import { createServerActionProcedure } from "zsa";
import { getUserAuthenticate, getWorkspaceSelected } from "./security";

const authorizationService = AuthorizationService.instance();
const membershipsRepository = MembershipsRepository.instance();
const usersRepository = UsersRepository.instance();

export const securityProcedure = (permissions?: PolicyName[]) =>
  createServerActionProcedure()
    .input(
      z
        .object({
          userId: z.string().optional(),
          workspaceId: z.string().optional(),
        })
        .optional()
    )
    .handler(async ({ input }) => {
      let user: User | null;
      let workspaceId: string | null;

      if (input?.userId && input?.workspaceId) {
        user = await usersRepository.retrieve(input.userId);
        workspaceId = input.workspaceId;
      } else {
        const [userAuth] = await getUserAuthenticate();
        user = userAuth;
        workspaceId = await getWorkspaceSelected();
      }

      if (!user || !workspaceId) throw NotAuthorized.throw();

      const membership =
        await membershipsRepository.retrieveByUserIdAndWorkspaceId(
          user?.id,
          workspaceId
        );

      if (!membership?.id) throw NotFound.instance("workspace");

      const isAllowed = authorizationService.can(
        permissions!,
        user,
        membership
      );

      if (!isAllowed) throw NotAuthorized.throw();
      return { user, membership };
    })
    .createServerAction();
