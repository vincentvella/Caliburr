import { Purchases, type Package as RCPackage } from '@revenuecat/purchases-js';

// Local types matching the .d.ts shim — avoids importing RevenueCat's stricter native types
export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    priceString: string;
    localizedTitle: string;
    localizedDescription: string;
  };
}

export interface PurchasesOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: PurchasesPackage[];
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}

export const PURCHASES_ERROR_CODE = {} as Record<string, number>;

// Cache of RC package objects by identifier for use in purchasePackage
const _rcPackageCache = new Map<string, RCPackage>();

function getInstance(): Purchases {
  if (Purchases.isConfigured()) {
    return Purchases.getSharedInstance();
  }
  // Configure with anonymous ID for unauthenticated price fetching
  return Purchases.configure({
    apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_WEB_KEY!,
    appUserId: Purchases.generateRevenueCatAnonymousAppUserId(),
  });
}

function adaptPackage(rcPkg: RCPackage): PurchasesPackage {
  const product = rcPkg.webBillingProduct;
  return {
    identifier: rcPkg.identifier,
    packageType: rcPkg.packageType as string,
    product: {
      identifier: product.identifier,
      priceString: product.currentPrice.formattedPrice,
      localizedTitle: product.title,
      localizedDescription: product.description ?? '',
    },
  };
}

export function configure() {
  // No-op — RC web SDK is configured on logIn or first use via getInstance()
}

export async function logIn(userId: string) {
  if (Purchases.isConfigured()) {
    await Purchases.getSharedInstance().changeUser(userId);
  } else {
    Purchases.configure({
      apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_WEB_KEY!,
      appUserId: userId,
    });
  }
}

export async function logOut() {
  if (Purchases.isConfigured()) {
    await Purchases.getSharedInstance().changeUser(
      Purchases.generateRevenueCatAnonymousAppUserId(),
    );
  }
}

export async function getBackerOffering(): Promise<PurchasesOffering | null> {
  const offerings = await getInstance().getOfferings();
  const offering = offerings.all['caliburr_backer'] ?? offerings.current;
  if (!offering) return null;

  _rcPackageCache.clear();
  offering.availablePackages.forEach((pkg) => _rcPackageCache.set(pkg.identifier, pkg));

  return {
    identifier: offering.identifier,
    serverDescription: offering.serverDescription,
    availablePackages: offering.availablePackages.map(adaptPackage),
    monthly: offering.monthly ? adaptPackage(offering.monthly) : null,
    annual: offering.annual ? adaptPackage(offering.annual) : null,
  };
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<void> {
  const rcPkg = _rcPackageCache.get(pkg.identifier);
  if (!rcPkg) throw new Error('Package not found — call getBackerOffering first');
  await getInstance().purchase({ rcPackage: rcPkg });
}

export async function restorePurchases(): Promise<boolean> {
  return isBackerActive();
}

export async function isBackerActive(): Promise<boolean> {
  try {
    const info = await getInstance().getCustomerInfo();
    return !!info.entitlements.active['backer'];
  } catch {
    return false;
  }
}
