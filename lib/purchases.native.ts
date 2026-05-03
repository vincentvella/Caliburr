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
  // Check the *current* app user ID, not originalAppUserId — the latter is the
  // first ID ever set on this install and stays as a real user ID even after a
  // prior logOut, which makes the guard miss subsequent anonymous sessions.
  const appUserId = await Purchases.getAppUserID();
  if (appUserId.startsWith('$RCAnonymousID:')) return;

  try {
    await Purchases.logOut();
  } catch (e) {
    // Race: another SIGNED_OUT firing or a state transition can flip RC to
    // anonymous between the getAppUserID() call above and this logOut().
    // The library throws code "22" — swallow that, rethrow anything else.
    if ((e as { code?: string })?.code === PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR) {
      return;
    }
    throw e;
  }
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
