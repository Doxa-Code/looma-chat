import { Membership } from "../entities/membership";
import { NotAuthorized } from "../errors/not-authorized";
import { Permission } from "./permissions";

export namespace MembershipService {
  export interface SetPermissions {
    userMembership: Membership;
    membership: Membership;
    permissions: Permission[];
  }
}
export class MembershipService {
  setPermissions(props: MembershipService.SetPermissions) {
    if (!props.userMembership.hasPermission("manage:users"))
      throw NotAuthorized.throw();

    props.membership.setPermissions(props.permissions);

    return props.membership;
  }

  static instance() {
    return new MembershipService();
  }
}
