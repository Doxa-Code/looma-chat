import {
  changeClientAddress
} from "@/app/actions/client";
import {
  createOpenApiServerActionRouter
} from "zsa-openapi";

export const clientsRouter = createOpenApiServerActionRouter({
  pathPrefix: "/api/conversation/{conversationId}/client"
})
  .put("/address", changeClientAddress)

