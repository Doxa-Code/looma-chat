import { Conversation } from "../domain/entities/conversation";
import { Message } from "../domain/entities/message";
import { InvalidCreation } from "../domain/errors/invalid-creation";
import { Attendant } from "../domain/value-objects/attendant";
import { Contact } from "../domain/value-objects/contact";
import { Sector } from "../domain/value-objects/sector";

test("Deve lançar um erro quando não tiver um contato vinculado", () => {
  expect(Conversation.create).toThrowError(InvalidCreation.throw());
});
test("Deve poder criar uma conversation", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  expect(conversation.contact.phone).toBe("5519999999999");
  expect(conversation.contact.name).toBe("John Doe");
});
test("Deve poder adicionar mensagens", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  expect(conversation.messages.length).toBe(0);
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo bem?",
      createdAt: new Date(),
      id: "1",
      sender: conversation.contact,
    })
  );
  expect(conversation.messages.length).toBe(1);
});
test("Deve registrar o atendente como responsavel quando ele enviar a primeira mensagem", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo bem?",
      createdAt: new Date(),
      id: "1",
      sender: conversation.contact,
    })
  );
  expect(conversation.attendant).toBe(null);
  expect(conversation.status).toBe("waiting");
  const messageAttendant = Message.create({
    type: "text",
    content: "Olá, tudo e vc? como posso ajuda-los?",
    createdAt: new Date(),
    id: "2",
    sender: Attendant.create("1", "John Doe"),
  });
  conversation.addMessage(messageAttendant);
  expect(conversation.messages.length).toBe(2);
  expect(conversation.messages.at(0)?.viewed).toBe(true);
  expect(conversation.attendant).toBeInstanceOf(Attendant);
  expect(conversation.attendant?.id).toBe("1");
  expect(conversation.attendant?.name).toBe("John Doe");
  expect(conversation.status).toBe("open");
  expect(conversation.openedAt).not.toBe(null);
});
test("Deve registrar as ultimas mensagens como visualizada somente quando o atendente responsável visualizar", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  const attendant = Attendant.create("1", "John Doe");
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo bem?",
      createdAt: new Date(),
      id: "1",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo e vc? como posso ajuda-los?",
      createdAt: new Date(),
      id: "2",
      sender: attendant,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Quero paracetamol",
      createdAt: new Date(),
      id: "3",
      sender: conversation.contact,
    })
  );
  conversation.openConversation("999");
  expect(conversation.messages.at(2)?.viewed).toBe(false);
  conversation.openConversation(attendant.id);
  expect(conversation.messages.at(2)?.viewed).toBe(true);
});
test("Deve poder transferir para outro setor", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  const attendant = Attendant.create("1", "John Doe");
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo bem?",
      createdAt: new Date(),
      id: "1",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo em que posso ajuda-lo?",
      createdAt: new Date(),
      id: "2",
      sender: attendant,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Para ce ta mol",
      createdAt: new Date(),
      id: "3",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Ta bom vou te transferir",
      createdAt: new Date(),
      id: "4",
      sender: attendant,
    })
  );

  expect(conversation.sector).toBe(null);

  conversation.transferToSector(Sector.create("1", "Atendimento"));

  expect(conversation.sector?.id).toBe("1");
  expect(conversation.sector?.name).toBe("Atendimento");
});
test("Deve poder transferir para outro atendente", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  const attendant = Attendant.create("1", "John Doe");
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo bem?",
      createdAt: new Date(),
      id: "1",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo em que posso ajuda-lo?",
      createdAt: new Date(),
      id: "2",
      sender: attendant,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Para ce ta mol",
      createdAt: new Date(),
      id: "3",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Ta bom vou te transferir",
      createdAt: new Date(),
      id: "4",
      sender: attendant,
    })
  );

  expect(conversation.attendant?.id).toBe(attendant.id);
  expect(conversation.attendant?.name).toBe(attendant.name);

  conversation.transferToAttendant(Attendant.create("2", "Mary"));

  expect(conversation.attendant?.id).toBe("2");
  expect(conversation.attendant?.name).toBe("Mary");
});
test("Deve poder mandar somente mensagens interna caso o atendente não seja o atual", () => {
  const conversation = Conversation.create(
    Contact.create("5519999999999", "John Doe")
  );
  const attendant = Attendant.create("1", "John Doe");
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo bem?",
      createdAt: new Date(),
      id: "1",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Olá, tudo em que posso ajuda-lo?",
      createdAt: new Date(),
      id: "2",
      sender: attendant,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Para ce ta mol",
      createdAt: new Date(),
      id: "3",
      sender: conversation.contact,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Ta bom vou te transferir",
      createdAt: new Date(),
      id: "4",
      sender: attendant,
    })
  );
  conversation.addMessage(
    Message.create({
      type: "text",
      content: "Transferencia por motivo tal!",
      createdAt: new Date(),
      id: "5",
      sender: attendant,
      internal: true,
    })
  );
  expect(conversation.messages.at(0)?.internal).toBe(false);
  expect(conversation.messages.at(1)?.internal).toBe(false);
  expect(conversation.messages.at(2)?.internal).toBe(false);
  expect(conversation.messages.at(3)?.internal).toBe(false);
  expect(conversation.messages.at(4)?.internal).toBe(true);
});
