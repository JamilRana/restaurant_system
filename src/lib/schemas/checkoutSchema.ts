// lib/schemas/checkoutSchema.ts
import { z } from "zod";

export const checkoutSchema = z
  .object({
    deliveryType: z.enum(["pickup", "delivery"]),
    address: z.string().min(5, "Address too short").optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryType === "delivery" && !data.address) return false;
      return true;
    },
    {
      message: "Delivery requires an address",
      path: ["address"],
    }
  );

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
