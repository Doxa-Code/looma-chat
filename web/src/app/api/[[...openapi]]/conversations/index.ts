import { createOpenApiServerActionRouter } from "zsa-openapi";
import { messagesRouter } from "./messages";
import { cartsRouter } from "./carts";
import { clientsRouter } from "./clients";

export const conversationsRouter = createOpenApiServerActionRouter({
  extend: [cartsRouter, clientsRouter, messagesRouter],
});
