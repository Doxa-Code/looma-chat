import { Product } from "@looma/core/domain/value-objects/product";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";

const finishCartValidate = z.object({
  cartId: z.string(),
  status: z.enum(["finished", "processing", "shipped", "cancelled"]),
  workspaceId: z.string(),
});

const cartsRepository = CartsDatabaseRepository.instance();

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Product.Props;
    const result = await finishCartValidate.safeParseAsync(body);

    if (!result.success) {
      return;
    }

    const cart = await cartsRepository.retrieve(result.data.cartId);

    if (!cart) return;

    switch (result.data.status) {
      case "cancelled": {
        cart.cancel("Cancelo pelo sistema da farmácia");
        break;
      }
      case "finished": {
        cart.finish();
        break;
      }
      case "processing": {
        cart.processing();
        break;
      }
      case "shipped": {
        cart.shipped();
        break;
      }
    }

    await cartsRepository.upsert(cart, result.data.workspaceId);
  }
};
