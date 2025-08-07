import { listenAudio } from "@/app/actions/conversations";
import { createOpenApiServerActionRouter } from "zsa-openapi";

export const messagesRouter = createOpenApiServerActionRouter({
  pathPrefix: "/api/conversations",
}).get("/message/{messageId}/audio", listenAudio);
