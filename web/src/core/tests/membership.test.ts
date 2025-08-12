import { Membership } from "../entities/membership";
import { User } from "../entities/user";
import { Workspace } from "../values-object/workspace";

test("O usuario deve poder ser vinculado a um workspace com permissões", () => {
  const membership = Membership.create(
    Workspace.create("Personal"),
    User.create({
      name: "User",
      email: "user@doxacode.com.br",
      password: "123456",
    })
  );

  expect(membership.permissions.length).toBe(1);
  expect(membership.permissions.at(0)).toBe("start:session");
});
