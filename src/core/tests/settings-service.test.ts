import { User } from "../entities/user";
import { NotAuthorized } from "../domain/errors/not-authorized";
import { SettingsService } from "../domain/services/settings-services";

test("Somente o superusuario deve poder alterar as settings", () => {
  const user = User.create({
    email: "system@doxacode.com.br",
    name: "System",
    password: "12345",
    type: "system",
  });

  const settingsService = SettingsService.instance();

  expect(() =>
    settingsService.update({
      user,
      input: { wabaId: "1" },
    })
  ).toThrowError(NotAuthorized.throw());

  const superuser = User.create({
    email: "system@doxacode.com.br",
    name: "System",
    password: "12345",
    type: "superuser",
  });

  const settingToSave2 = settingsService.update({
    user: superuser,
    input: { wabaId: "1" },
  });

  expect(settingToSave2.wabaId).toBe("1");
});
