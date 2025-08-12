import {
  retrieveOpenCart,
  upsertProductOnCart,
  removeProductFromCart,
  orderCart,
  expireCart,
  cancelCart,
  setCartAddress,
  setPaymentMethod,
} from "@/app/actions/cart";
import { createOpenApiServerActionRouter } from "zsa-openapi";

export const cartsRouter = createOpenApiServerActionRouter({
  pathPrefix: "/api/conversation/{conversationId}/cart",
})
  .get("/", retrieveOpenCart)
  .put("/product/{productId}", upsertProductOnCart)
  .delete("/product/{productId}", removeProductFromCart)
  .put("/address", setCartAddress)
  .put("/paymentMethod", setPaymentMethod)
  .put("/order", orderCart)
  .put("/expire", expireCart)
  .put("/cancel", cancelCart);
