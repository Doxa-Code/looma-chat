import {
  changeStatusMessage,
  markLastMessagesContactAsViewed,
  messageReceived,
  sendMessage,
  sendTyping,
} from "@/app/actions/messages";
import { retrieveSettings } from "@/app/actions/settings";
import { sse } from "@/app/actions/sse";
import {
  createOpenApiServerActionRouter,
  createRouteHandlers,
} from "zsa-openapi";

const router = createOpenApiServerActionRouter({
  pathPrefix: "/api",
})
  .get("/sse", sse)
  .get("/settings", retrieveSettings)
  .post("/message/status", changeStatusMessage)
  .post("/message/received", messageReceived)
  .post("/message/viewed", markLastMessagesContactAsViewed)
  .post("/message/send", sendMessage)
  .post("/message/typing", sendTyping);

export const { GET, POST, PUT, DELETE } = createRouteHandlers(router) as any;
