"use server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { createServerAction } from "zsa";
import { COOKIE_TOKEN_NAME, COOKIE_WORKSPACE_NAME } from "../constants";
import { UsersRepository } from "@/core/infra/repositories/users-repository";

export async function checkPassword(password: string, encrypted: string) {
  return bcrypt.compareSync(password, encrypted);
}

export async function getUserAuthenticateId() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_TOKEN_NAME);

  if (!token?.value) return null;

  const decoded = jwt.decode(token.value) as { id: string };

  if (!decoded?.id) return null;

  return decoded.id;
}

export const getUserAuthenticate = createServerAction().handler(async () => {
  const usersRepository = UsersRepository.instance();
  const userId = await getUserAuthenticateId();
  if (!userId) return null;

  const user = await usersRepository.retrieve(userId);

  if (!user) return null;

  return user;
});

export const getWorkspaceSelected = async () => {
  const cookiesStore = await cookies();

  const workspaceId = cookiesStore.get(COOKIE_WORKSPACE_NAME)?.value;

  return workspaceId ?? null;
};
