import type { ShopInfo } from "@/lib/types";

/**
 * The seller block printed on bills and order forms. Kept in env so one
 * deployment serves one store without a settings screen; move this to a Sheet
 * tab when the product goes multi store.
 */
export const shop: ShopInfo = {
  name: process.env.SHOP_NAME || "Your Store Name",
  address: process.env.SHOP_ADDRESS || "Shop address, city, state, PIN",
  gstin: process.env.SHOP_GSTIN || "",
  phone: process.env.SHOP_PHONE || "",
  email: process.env.SHOP_EMAIL || "",
  state: process.env.SHOP_STATE || "Tamil Nadu",
  bank: process.env.SHOP_BANK || "",
};
