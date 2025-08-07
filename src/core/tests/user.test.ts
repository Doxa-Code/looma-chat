import { User } from "../entities/user";

test("um usuario system não pode iniciar uma sessão", () => {
  const user = User.create({
    email: "joe.doe@doxacode.com.br",
    name: "John Doe",
    password: "12345",
    type: "system",
  });

  expect(user.canStartSession()).toBe(false);
});

test("a senha deve ser cryptografada na criação", () => {
  const user = User.create({
    email: "joe.doe@doxacode.com.br",
    name: "John Doe",
    password: "12345",
    type: "system",
  });

  expect(user.password).not.toBe("12345");
});
