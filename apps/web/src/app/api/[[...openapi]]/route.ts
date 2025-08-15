import {
  receivedMessage,
  registerMessaging,
} from "@/app/actions/conversations";
import { sse } from "@/app/actions/sse";
import {
  createOpenApiServerActionRouter,
  createRouteHandlers,
} from "zsa-openapi";
import { conversationsRouter } from "./conversations/index";

const router = createOpenApiServerActionRouter({
  pathPrefix: "/api",
  extend: [conversationsRouter],
})
  .get("/sse", sse)
  .get("/messaging", registerMessaging)
  .post("/messaging", receivedMessage);

export const { GET, POST, PUT, DELETE } = createRouteHandlers(router) as any;
