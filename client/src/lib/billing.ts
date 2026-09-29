import { registerPlugin } from "@capacitor/core";

export const BAZAAR_GROWTH_YEARLY_PRODUCT_ID = "bizsanj_growth_yearly";

export type BillingStatus = {
  available: boolean;
  entitled: boolean;
  productId: string;
  source: "bazaar" | "web" | "unknown";
  message?: string;
};

type BazaarBillingPlugin = {
  getStatus(options?: { productId?: string }): Promise<BillingStatus>;
  purchase(options: { productId: string }): Promise<{ entitled: boolean; productId: string; purchaseToken?: string }>;
  restore(options?: { productId?: string }): Promise<BillingStatus>;
};

const BazaarBilling = registerPlugin<BazaarBillingPlugin>("BazaarBilling");

export async function getBillingStatus(): Promise<BillingStatus> {
  try {
    return await BazaarBilling.getStatus({ productId: BAZAAR_GROWTH_YEARLY_PRODUCT_ID });
  } catch {
    return {
      available: false,
      entitled: false,
      productId: BAZAAR_GROWTH_YEARLY_PRODUCT_ID,
      source: "web",
      message: "پرداخت بازار فقط در نسخه Android در دسترس است.",
    };
  }
}

export async function purchaseGrowthYearly() {
  return BazaarBilling.purchase({ productId: BAZAAR_GROWTH_YEARLY_PRODUCT_ID });
}

export async function restoreGrowthYearly() {
  return BazaarBilling.restore({ productId: BAZAAR_GROWTH_YEARLY_PRODUCT_ID });
}
