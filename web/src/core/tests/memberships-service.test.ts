import { Membership } from "../entities/membership";
import { User } from "../entities/user";
import { NotAuthorized } from "../domain/errors/not-authorized";
import { MembershipService } from "../domain/services/memberships-service";
import { Workspace } from "../values-object/workspace";

test("O usuario que tiver a permissão de gerenciamento de usuario, deve poder alterar as permissões granularmente para cada usuario", () => {
  const userMembership = Membership.create(
    Workspace.create("Personal"),
    User.create({
      name: "User",
      email: "user@doxacode.com.br",
      password: "123456",
    })
  );
  const membership = Membership.create(
    Workspace.create("Personal"),
    User.create({
      name: "User",
      email: "user@doxacode.com.br",
      password: "123456",
    })
  );

  expect(membership.permissions.length).toBe(1);

  const membershipsService = MembershipService.instance();

  expect(() =>
    membershipsService.setPermissions({
      userMembership,
      membership,
      permissions: ["start:session", "update:settings"],
    })
  ).toThrowError(NotAuthorized.throw());

  userMembership.addPermission("manage:users");

  const membershipToSave2 = membershipsService.setPermissions({
    userMembership,
    membership,
    permissions: ["start:session", "update:settings"],
  });

  expect(membershipToSave2.permissions.length).toBe(2);
});
