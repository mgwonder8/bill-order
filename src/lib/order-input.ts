import { z } from "zod";
import { listSizes, type OrderInput } from "@/lib/store/data";
import { toSizeSet } from "@/lib/sets";

export const OrderBody = z.object({
  customerName: z.string().trim().default(""),
  customerPhone: z.string().trim().default(""),
  customerGstin: z.string().trim().toUpperCase().default(""),
  customerAddress: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  lines: z
    .array(
      z.object({
        sizeId: z.string().trim().default(""),
        articleCode: z.string().trim().min(1, "Every line needs an article code"),
        brand: z.string().trim().default(""),
        fabric: z.string().trim().default(""),
        supplierName: z.string().trim().default(""),
        supplierGstin: z.string().trim().default(""),
        supplierPhone: z.string().trim().default(""),
        size: z.string().trim().default(""),
        pcsPerSet: z.coerce.number().int().min(1).max(50).default(1),
        sets: z.coerce.number().int().min(1, "Quantity must be at least 1 set"),
        rate: z.coerce.number().min(0),
      })
    )
    .min(1, "Scan a tag to add at least one item"),
});

/**
 * Lines that match a saved article take supplier and rate from the catalog, so a
 * stale screen or a hand-edited request cannot change who gets the reorder.
 */
export async function resolveOrder(body: z.infer<typeof OrderBody>): Promise<OrderInput> {
  const catalog = new Map((await listSizes()).map((z) => [z.id, z]));
  return {
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerGstin: body.customerGstin,
    customerAddress: body.customerAddress,
    notes: body.notes,
    lines: body.lines.map((l) => {
      const known = l.sizeId ? catalog.get(l.sizeId) : undefined;
      if (known) {
        return {
          sizeId: known.id,
          articleCode: known.articleCode,
          brand: known.brand,
          fabric: known.fabric,
          supplierName: known.supplierName,
          supplierGstin: known.supplierGstin,
          supplierPhone: known.supplierPhone,
          size: known.size,
          sizes: known.sizes,
          pcsPerSet: l.pcsPerSet || known.pcsPerSet,
          sets: l.sets,
          pieces: l.sets * (l.pcsPerSet || known.pcsPerSet),
          rate: known.rate,
        };
      }
      const set = toSizeSet(l.size);
      return {
        ...l,
        sizeId: "",
        size: set.label || l.size,
        sizes: set.sizes.join("/"),
        pieces: l.sets * l.pcsPerSet,
      };
    }),
  };
}
