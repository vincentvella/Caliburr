// Type shim — Metro resolves to purchases.native.ts or purchases.web.ts.

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

export declare const PURCHASES_ERROR_CODE: Record<string, number>;

export declare function configure(): void;
export declare function logIn(userId: string): Promise<void>;
export declare function logOut(): Promise<void>;
export declare function getBackerOffering(): Promise<PurchasesOffering | null>;
export declare function purchasePackage(pkg: PurchasesPackage): Promise<void>;
export declare function restorePurchases(): Promise<boolean>;
export declare function isBackerActive(): Promise<boolean>;
