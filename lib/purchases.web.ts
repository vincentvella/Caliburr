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

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return '';
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function makePackage(
  tier: 'monthly' | 'annual',
  amount: number | null,
  currency: string,
): PurchasesPackage {
  const isAnnual = tier === 'annual';
  return {
    identifier: tier,
    packageType: isAnnual ? 'ANNUAL' : 'MONTHLY',
    product: {
      identifier: `coffee.caliburr.backer.${tier}`,
      priceString: formatPrice(amount, currency),
      localizedTitle: `Caliburr Backer ${isAnnual ? 'Annual' : 'Monthly'}`,
      localizedDescription: isAnnual
        ? 'Support Caliburr annually — save 37%'
        : 'Support Caliburr monthly',
    },
  };
}

export function configure() {}
export async function logIn(_userId: string) {}
export async function logOut() {}

export async function getBackerOffering(): Promise<PurchasesOffering | null> {
  let monthly: PurchasesPackage;
  let annual: PurchasesPackage;

  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
    );
    if (res.ok) {
      const data = (await res.json()) as {
        monthly: { amount: number | null; currency: string };
        annual: { amount: number | null; currency: string };
      };
      monthly = makePackage('monthly', data.monthly.amount, data.monthly.currency);
      annual = makePackage('annual', data.annual.amount, data.annual.currency);
    } else {
      throw new Error('Failed to fetch prices');
    }
  } catch {
    // Fallback to USD defaults if the fetch fails
    monthly = makePackage('monthly', 199, 'usd');
    annual = makePackage('annual', 1499, 'usd');
  }

  return {
    identifier: 'backer_web',
    serverDescription: 'Caliburr Backer',
    availablePackages: [monthly, annual],
    monthly,
    annual,
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
