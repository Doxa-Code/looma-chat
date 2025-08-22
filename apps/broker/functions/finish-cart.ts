import { Product } from "@looma/core/domain/value-objects/product";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";

const finishCartValidate = z.object({
  cartId: z.string(),
  status: z.string(),
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

    cart.finish();

    await cartsRepository.upsert(cart, result.data.workspaceId);
  }
};
