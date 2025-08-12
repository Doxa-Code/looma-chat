import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Product } from "@looma/core/domain/value-objects/product";
import z from "zod";
import { ProductsRepository } from "@looma/core/infra/repositories/products-repository";

const productValidate = z.object({
  workspaceId: z.string(),
  product: z.object({
    id: z.string(),
    description: z.string(),
    code: z.string().nullable(),
    manufactory: z.string(),
    price: z.number(),
    stock: z.number(),
    promotionPrice: z.number().nullable(),
    promotionStart: z.date().nullable(),
    promotionEnd: z.date().nullable(),
  }),
});

const productsRepository = ProductsRepository.instance();

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Product.Props;
    const result = await productValidate.safeParseAsync(body);

    if (!result.success) {
      return;
    }

    const product = Product.instance(result.data.product);

    await productsRepository.upsert(product, result.data.workspaceId);
  }
};
