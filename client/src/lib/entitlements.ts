import { supabase } from './supabase';
import { revenueCat } from './revenuecat';
import { CustomerInfo } from '@revenuecat/purchases-capacitor';

export interface UserEntitlement {
  id: string;
  user_id: string;
  entitlement_id: string;
  is_active: boolean;
  expires_at: string | null;
  product_identifier: string;
  last_updated: string;
  created_at: string;
}

export interface EntitlementSyncResult {
  success: boolean;
  entitlements: UserEntitlement[];
  error?: string;
}

class EntitlementService {
  
  /**
   * Sync RevenueCat entitlements to Supabase
   * Called after successful purchases or when checking subscription status
   */
  async syncEntitlementsToSupabase(customerInfo: CustomerInfo): Promise<EntitlementSyncResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, entitlements: [], error: 'User not authenticated' };
      }

      const entitlements: Partial<UserEntitlement>[] = [];

      // Convert RevenueCat entitlements to Supabase format
      Object.entries(customerInfo.entitlements.active).forEach(([entitlementId, entitlement]) => {
        entitlements.push({
          user_id: user.id,
          entitlement_id: entitlementId,
          is_active: true,
          expires_at: entitlement.expirationDate,
          product_identifier: entitlement.productIdentifier,
          last_updated: new Date().toISOString(),
        });
      });

      // Also include inactive entitlements for completeness
      Object.entries(customerInfo.entitlements.all).forEach(([entitlementId, entitlement]) => {
        // Skip if already added as active
        if (customerInfo.entitlements.active[entitlementId]) return;

        entitlements.push({
          user_id: user.id,
          entitlement_id: entitlementId,
          is_active: false,
          expires_at: entitlement.expirationDate,
          product_identifier: entitlement.productIdentifier,
          last_updated: new Date().toISOString(),
        });
      });

      // Upsert entitlements to Supabase
      const { data, error } = await supabase
        .from('user_entitlements')
        .upsert(entitlements, { 
          onConflict: 'user_id,entitlement_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Failed to sync entitlements to Supabase:', error);
        return { success: false, entitlements: [], error: error.message };
      }

      return { success: true, entitlements: data || [] };

    } catch (error) {
      console.error('Entitlement sync error:', error);
      return { success: false, entitlements: [], error: String(error) };
    }
  }

  /**
   * Get user entitlements from Supabase
   */
  async getUserEntitlements(): Promise<UserEntitlement[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to fetch user entitlements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user entitlements:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific entitlement
   */
  async hasEntitlement(entitlementId: string): Promise<boolean> {
    const entitlements = await this.getUserEntitlements();
    return entitlements.some(e => 
      e.entitlement_id === entitlementId && 
      e.is_active && 
      (e.expires_at === null || new Date(e.expires_at) > new Date())
    );
  }

  /**
   * Get user's subscription tier based on entitlements
   */
  async getUserTier(): Promise<'free' | 'hobby_pro'> {
    const hasHobbyPro = await this.hasEntitlement('hobby_pro');
    return hasHobbyPro ? 'hobby_pro' : 'free';
  }

  /**
   * Purchase and sync entitlements
   */
  async purchaseAndSync(packageIdentifier: string): Promise<{ success: boolean, tier?: 'free' | 'hobby_pro' }> {
    try {
      // Make the purchase through RevenueCat
      const customerInfo = await revenueCat.purchasePackage(packageIdentifier);
      
      if (!customerInfo) {
        return { success: false };
      }

      // Sync entitlements to Supabase
      const syncResult = await this.syncEntitlementsToSupabase(customerInfo);
      
      if (!syncResult.success) {
        console.warn('Purchase successful but entitlement sync failed:', syncResult.error);
      }

      const tier = await this.getUserTier();
      return { success: true, tier };

    } catch (error) {
      console.error('Purchase and sync failed:', error);
      return { success: false };
    }
  }

  /**
   * Restore purchases and sync entitlements
   */
  async restoreAndSync(): Promise<{ success: boolean, tier?: 'free' | 'hobby_pro' }> {
    try {
      // Restore purchases through RevenueCat
      const customerInfo = await revenueCat.restorePurchases();
      
      if (!customerInfo) {
        return { success: false };
      }

      // Sync entitlements to Supabase
      const syncResult = await this.syncEntitlementsToSupabase(customerInfo);
      
      if (!syncResult.success) {
        console.warn('Restore successful but entitlement sync failed:', syncResult.error);
      }

      const tier = await this.getUserTier();
      return { success: true, tier };

    } catch (error) {
      console.error('Restore and sync failed:', error);
      return { success: false };
    }
  }
}

export const entitlementService = new EntitlementService();