import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

export { PURCHASES_ERROR_CODE };

export type { PurchasesOffering, PurchasesPackage };

export function configure() {
  const apiKey =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID_KEY!
      : process.env.EXPO_PUBLIC_REVENUE_CAT_IOS_KEY!;
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
}

export async function logIn(userId: string) {
  await Purchases.logIn(userId);
}

export async function logOut() {
  await Purchases.logOut();
}

export async function getBackerOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.all['caliburr_backer'] ?? offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<void> {
  await Purchases.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return !!info.entitlements.active['backer'];
}

export async function isBackerActive(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return !!info.entitlements.active['backer'];
}
