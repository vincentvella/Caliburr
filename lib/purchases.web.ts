import { supabase } from '@/lib/supabase';

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

// Static web offering — prices match App Store / Play Store tiers
const MONTHLY_PACKAGE: PurchasesPackage = {
  identifier: 'monthly',
  packageType: 'MONTHLY',
  product: {
    identifier: 'coffee.caliburr.backer.monthly',
    priceString: '$1.99',
    localizedTitle: 'Caliburr Backer Monthly',
    localizedDescription: 'Support Caliburr monthly',
  },
};

const ANNUAL_PACKAGE: PurchasesPackage = {
  identifier: 'annual',
  packageType: 'ANNUAL',
  product: {
    identifier: 'coffee.caliburr.backer.annual',
    priceString: '$14.99',
    localizedTitle: 'Caliburr Backer Annual',
    localizedDescription: 'Support Caliburr annually — save 37%',
  },
};

export function configure() {}
export async function logIn(_userId: string) {}
export async function logOut() {}

export async function getBackerOffering(): Promise<PurchasesOffering | null> {
  return {
    identifier: 'backer_web',
    serverDescription: 'Caliburr Backer',
    availablePackages: [MONTHLY_PACKAGE, ANNUAL_PACKAGE],
    monthly: MONTHLY_PACKAGE,
    annual: ANNUAL_PACKAGE,
  };
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<void> {
  const tier = pkg.identifier === 'annual' ? 'annual' : 'monthly';

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ tier }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to create checkout session');
  }

  const { url } = (await response.json()) as { url: string };
  window.location.href = url;
}

export async function restorePurchases(): Promise<boolean> {
  return isBackerActive();
}

export async function isBackerActive(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // profiles table may not be in generated types yet — cast to any
  const { data } = await (supabase as any)
    .from('profiles')
    .select('backer_tier')
    .eq('user_id', user.id)
    .single();

  return !!(data as { backer_tier?: string | null } | null)?.backer_tier;
}
