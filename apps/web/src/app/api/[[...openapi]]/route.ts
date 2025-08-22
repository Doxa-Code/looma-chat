import { registerMessaging } from "@/app/actions/conversations";
import { receivedMessage } from "@/app/actions/messages";
import { sse } from "@/app/actions/sse";
import {
  createOpenApiServerActionRouter,
  createRouteHandlers,
} from "zsa-openapi";

const router = createOpenApiServerActionRouter({
  pathPrefix: "/api",
})
  .get("/sse", sse)
  .get("/messaging", registerMessaging)
  .post("/messaging", receivedMessage);

export const { GET, POST, PUT, DELETE } = createRouteHandlers(router) as any;
