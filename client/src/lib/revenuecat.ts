import { Purchases, LOG_LEVEL, PurchasesOffering, CustomerInfo } from '@revenuecat/purchases-capacitor'

export interface RevenueCatConfig {
  apiKey: string;
  appUserID?: string;
}

class RevenueCatService {
  private initialized = false;

  async initialize(config: RevenueCatConfig): Promise<void> {
    if (this.initialized) return;

    try {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      await Purchases.configure({ 
        apiKey: config.apiKey,
        appUserID: config.appUserID 
      });
      this.initialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return Object.values(offerings.all);
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return [];
    }
  }

  async purchasePackage(packageIdentifier: string): Promise<CustomerInfo | null> {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering) {
        throw new Error('No current offering available');
      }

      const packageToPurchase = currentOffering.availablePackages.find(
        pkg => pkg.identifier === packageIdentifier
      );

      if (!packageToPurchase) {
        throw new Error(`Package ${packageIdentifier} not found`);
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
      return customerInfo;
    } catch (error) {
      console.error('Purchase failed:', error);
      return null;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  async restorePurchases(): Promise<CustomerInfo | null> {
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return null;
    }
  }

  hasActiveSubscription(customerInfo: CustomerInfo, entitlementId: string): boolean {
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  }

  getUserTier(customerInfo: CustomerInfo): 'free' | 'hobby_pro' {
    if (this.hasActiveSubscription(customerInfo, 'hobby_pro')) {
      return 'hobby_pro';
    }
    return 'free';
  }
}

export const revenueCat = new RevenueCatService();