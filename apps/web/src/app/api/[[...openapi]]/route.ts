import {
  refreshConversation,
  typingConversation,
  untypingConversation,
} from "@/app/actions/conversations";
import {
  changeStatusMessage,
  messageReceived,
  saveMessageResponse,
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
  .post("/conversation/message/received", messageReceived)
  .put("/conversation/message/{messageId}", changeStatusMessage)
  .post(
    "/conversation/{conversationId}/message/{messageId}",
    saveMessageResponse
  )
  .get("/conversation/{conversationId}/refresh", refreshConversation)
  .get("/conversation/{conversationId}/typing", typingConversation)
  .get("/conversation/{conversationId}/untyping", untypingConversation);

export const { GET, POST, PUT, DELETE } = createRouteHandlers(router) as any;
