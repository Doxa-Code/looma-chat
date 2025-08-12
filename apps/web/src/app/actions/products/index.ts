"use server";
import { ProductsRepository } from "@looma/core/infra/repositories/products-repository";
import z from "zod";
import { securityProcedure } from "../procedure";

const productsRepository = ProductsRepository.instance();

export const listAllProducts = securityProcedure(["view:products"])
  .input(
    z.object({
      page: z.number().optional().default(1),
      size: z.number().optional().default(20),
      searchTerm: z.string().optional(),
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          id: z.string(),
          description: z.string(),
          code: z.string().nullable().default(""),
          manufactory: z.string(),
          price: z.number(),
          stock: z.number(),
          promotionPrice: z.number().nullable(),
          promotionStart: z.date().nullable(),
          promotionEnd: z.date().nullable(),
        })
      ),
      total: z.number().default(0),
    })
  )
  .handler(async ({ input, ctx }) => {
    const { products, total } = await productsRepository.list({
      page: input.page,
      pageSize: input.size,
      workspaceId: ctx.membership.workspaceId,
      searchTerm: input.searchTerm,
    });

    return {
      products,
      total,
    };
  });
