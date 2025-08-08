"use server";
import { COOKIE_TOKEN_NAME, COOKIE_WORKSPACE_NAME } from "@/app/constants";
import { WorkspaceServices } from "@/core/application/services/workspace-services";
import { Membership } from "@/core/domain/entities/membership";
import { User } from "@/core/domain/entities/user";
import { InvalidCreation } from "@/core/domain/errors/invalid-creation";
import { NotAuthorized } from "@/core/domain/errors/not-authorized";
import {
  AuthorizationService,
  PolicyName,
} from "@/core/domain/services/authorization-service";
import { BcryptPasswordDriver } from "@/core/infra/drivers/password-driver";
import { JWTTokenDriver } from "@/core/infra/drivers/token-driver";
import { MembershipsRepository } from "@/core/infra/repositories/membership-repository";
import { SectorsRepository } from "@/core/infra/repositories/sectors-respository";
import { UsersRepository } from "@/core/infra/repositories/users-repository";
import { WorkspacesRepository } from "@/core/infra/repositories/workspaces-repository";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerAction } from "zsa";
import { securityProcedure } from "../procedure";
import { Workspace } from "@/core/domain/value-objects/workspace";
import { revalidatePath } from "next/cache";

const usersRepository = UsersRepository.instance();
const authorizationService = AuthorizationService.instance();
const passwordDriver = BcryptPasswordDriver.instance();
const workspaceServices = WorkspaceServices.instance();
const workspacesRepository = WorkspacesRepository.instance();
const tokenDriver = JWTTokenDriver.instance();
const membershipRepository = MembershipsRepository.instance();
const sectorsRepository = SectorsRepository.instance();

export const upsertWorkspace = securityProcedure(["upsert:workspaces"])
  .input(
    z.object({
      id: z.string().optional(),
      name: z.string(),
    })
  )
  .handler(async ({ ctx, input }) => {
    const workspace = Workspace.create(input.name, input.id);
    await workspacesRepository.upsert(workspace);
    const membership = Membership.create(workspace.id, ctx.user.id);
    membership.setPermissions([
      "manage:users",
      "start:session",
      "upsert:workspaces",
    ]);
    await membershipRepository.upsert(membership);
    revalidatePath("/", "layout");
  });

export const changeWorkspace = securityProcedure()
  .input(
    z.object({
      workspaceId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_WORKSPACE_NAME, input.workspaceId);
    revalidatePath("/", "layout");
  });

export const listWorkspaces = securityProcedure()
  .output(
    z.object({
      workspaces: z.array(z.object({ id: z.string(), name: z.string() })),
      workspace: z.object({ id: z.string(), name: z.string() }),
    })
  )
  .handler(async ({ ctx }) => {
    const workspaces = await workspacesRepository.list(ctx.user.id);
    return {
      workspaces,
      workspace: workspaces.find((w) => w.id === ctx.membership.workspaceId)!,
    };
  });

export const authenticate = createServerAction()
  .input(
    z.object({
      email: z.string(),
      password: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const user = await usersRepository.retrieveUserByEmail(input.email);

    if (!user) throw NotAuthorized.throw();

    const membership = await membershipRepository.retrieveFirstByUserId(
      user.id
    );

    if (!membership) throw NotAuthorized.throw();

    const isAllowed = authorizationService.can(
      "start:session",
      user,
      membership
    );

    if (!isAllowed) throw NotAuthorized.throw();

    const password = await usersRepository.retrievePassword(user.id);

    if (!password) throw NotAuthorized.throw();

    const passIsCorrect = passwordDriver.compare(input.password, password);

    if (!passIsCorrect) throw NotAuthorized.throw();

    const workspace = await workspacesRepository.retrieveFirstWorkspaceByUserId(
      user.id
    );

    let workspaceId = workspace?.id;

    if (!workspace) {
      workspaceId = await workspaceServices.create("Geral");
    }

    if (!workspaceId) throw InvalidCreation.throw();

    const token = tokenDriver.create(user.id);

    const cookieStore = await cookies();

    cookieStore.set(COOKIE_TOKEN_NAME, token);
    cookieStore.set(COOKIE_WORKSPACE_NAME, workspaceId);

    redirect(`/chat`);
  });

export const upsertUser = securityProcedure(["manage:users", "upsert:users"])
  .input(
    z.object({
      id: z.string().nullish(),
      name: z.string(),
      email: z.string(),
      type: z.enum(["user", "superuser", "system"]).default("user"),
      sectorId: z.string().optional(),
    })
  )
  .handler(async ({ ctx, input }) => {
    let user = await usersRepository.retrieve(input.id!);
    if (!user) {
      user = User.create({
        email: input.email,
        name: input.name,
        type: input?.type,
      });
    } else {
      user.update({ name: input.name, email: input.email, type: input?.type });
    }

    const sector = await sectorsRepository.retrieve(input.sectorId);

    user.assignSector(sector);

    await usersRepository.upsert(user);

    const membershipAlreadyExists =
      await membershipRepository.retrieveByUserIdAndWorkspaceId(
        user.id,
        ctx.membership.workspaceId
      );

    if (!membershipAlreadyExists) {
      const membership = Membership.create(ctx.membership.workspaceId, user.id);

      await membershipRepository.upsert(membership);
    }
  });

export const listUsers = securityProcedure([
  "manage:users",
  "view:users",
]).handler(async ({ ctx }) => {
  return await usersRepository.list(ctx.membership.workspaceId);
});

export const signOut = createServerAction().handler(async () => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_TOKEN_NAME);
  redirect("/");
});

export const removeUser = securityProcedure(["manage:users", "remove:users"])
  .input(
    z.object({
      ids: z.array(z.string()),
    })
  )
  .handler(async ({ input }) => {
    for (const id of input.ids) {
      await usersRepository.remove(id);
    }
  });

export const upsertPermissions = securityProcedure([
  "manage:users",
  "upsert:permissions",
])
  .input(
    z.object({
      permissions: z.array(z.string()),
      userId: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const membership =
      await membershipRepository.retrieveByUserIdAndWorkspaceId(
        input.userId,
        ctx.membership.workspaceId
      );
    if (!membership) return;
    membership.setPermissions(input.permissions as PolicyName[]);
    await membershipRepository.upsert(membership);
  });
