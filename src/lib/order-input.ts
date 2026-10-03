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

export const BillBody = z.object({
  customerName: z.string().trim().min(1, "Enter the customer name"),
  customerPhone: z.string().trim().default(""),
  customerGstin: z.string().trim().toUpperCase().default(""),
  customerAddress: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  hsn: z.string().trim().default(""),
  lines: z
    .array(
      z.object({
        sizeId: z.string().trim().min(1),
        sets: z.coerce.number().int().min(0).max(9999),
        loosePieces: z.coerce.number().int().min(0).max(99999),
        rate: z.coerce.number().min(0),
        discountPct: z.coerce.number().min(0).max(100).default(0),
      })
    )
    .min(1, "Add at least one item"),
});
