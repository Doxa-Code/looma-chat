import {
  refreshConversation,
  typingConversation,
  untypingConversation,
} from "@/app/actions/conversations";
import { sse } from "@/app/actions/sse";
import {
  createOpenApiServerActionRouter,
  createRouteHandlers,
} from "zsa-openapi";

const router = createOpenApiServerActionRouter({
  pathPrefix: "/api",
})
  .get("/sse", sse)
  .get("/conversation/{conversationId}/refresh", refreshConversation)
  .get("/conversation/{conversationId}/typing", typingConversation)
  .get("/conversation/{conversationId}/untyping", untypingConversation);

export const { GET, POST, PUT, DELETE } = createRouteHandlers(router) as any;
