"use server";
import z from "zod";
import { securityProcedure } from "../procedure";
import { BrasilAPISearchZipCodeDriver } from "@looma/core/infra/drivers/search-zipcode-driver";

export const consultingCEP = securityProcedure(["manage:carts"])
  .input(
    z.object({
      zipCode: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const searchZipCodeDriver = BrasilAPISearchZipCodeDriver.instance();
    const address = await searchZipCodeDriver.search(input.zipCode);
    return address;
  });
