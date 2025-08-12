import { User } from "../entities/user";
import { NotAuthorized } from "../errors/not-authorized";
import { Setting, SettingProps } from "../value-objects/setting";

export namespace SettingsService {
  export interface Update {
    user: User;
    input: SettingProps;
  }
}

export class SettingsService {
  update(props: SettingsService.Update) {
    if (!props.user.isSuperUser()) throw NotAuthorized.throw();
    return Setting.create(props.input);
  }

  static instance() {
    return new SettingsService();
  }
}
