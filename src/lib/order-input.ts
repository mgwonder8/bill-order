import { z } from "zod";

/** Supplier order body. Supplier details come from the scanned articles, never from the request. */
export const OrderBody = z.object({
  notes: z.string().trim().default(""),
  lines: z
    .array(
      z.object({
        sizeId: z.string().trim().min(1),
        sets: z.coerce.number().int().min(1, "Quantity must be at least 1 set").max(9999),
        rate: z.coerce.number().min(0),
        sellRate: z.coerce.number().min(0).default(0),
      })
    )
    .min(1, "Scan a tag to add at least one item"),
});

const customer = {
  customerName: z.string().trim().default(""),
  customerPhone: z.string().trim().default(""),
  customerGstin: z.string().trim().toUpperCase().default(""),
  customerAddress: z.string().trim().default(""),
};

export const CustomerOrderBody = z.object({
  ...customer,
  notes: z.string().trim().default(""),
  lines: z
    .array(
      z.object({
        sizeId: z.string().trim().min(1),
        sets: z.coerce.number().int().min(0).max(99999),
        pieces: z.coerce.number().int().min(1, "Every item needs a quantity").max(999999),
        rate: z.coerce.number().min(0),
      })
    )
    .min(1, "Scan a tag to add at least one article"),
});

export const BillBody = z.object({
  ...customer,
  orderId: z.string().trim().min(1),
  gstMode: z.enum(["with", "without"]).default("with"),
  hsn: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  discounts: z.record(z.string(), z.coerce.number().min(0).max(100)).default({}),
});
