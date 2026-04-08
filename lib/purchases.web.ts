import type { PurchasesOffering, PurchasesPackage } from './purchases.native';

export const PURCHASES_ERROR_CODE = {} as Record<string, number>;

export type { PurchasesOffering, PurchasesPackage };

export function configure() {}
export async function logIn(_userId: string) {}
export async function logOut() {}
export async function getBackerOffering(): Promise<PurchasesOffering | null> { return null; }
export async function purchasePackage(_pkg: PurchasesPackage): Promise<void> {
  throw new Error('Purchases are not supported on web.');
}
export async function restorePurchases(): Promise<boolean> { return false; }
export async function isBackerActive(): Promise<boolean> { return false; }
