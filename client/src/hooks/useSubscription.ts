import { useState, useEffect } from 'react'
import { CustomerInfo } from '@revenuecat/purchases-capacitor'
import { entitlementService } from '@/lib/entitlements'
import { SUBSCRIPTION_TIERS, hasFeatureAccess, isWithinLimit } from '@/lib/subscriptions'

export function useSubscription() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<'free' | 'hobby_pro'>('free')

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      // Load subscription tier from Supabase entitlements
      const tier = await entitlementService.getUserTier()
      setUserTier(tier)
    } catch (error) {
      console.error('Failed to load subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const purchaseHobbyPro = async (): Promise<boolean> => {
    try {
      const result = await entitlementService.purchaseAndSync('hobby_pro_monthly')
      if (result.success && result.tier) {
        setUserTier(result.tier)
        return true
      }
      return false
    } catch (error) {
      console.error('Purchase failed:', error)
      return false
    }
  }

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const result = await entitlementService.restoreAndSync()
      if (result.success && result.tier) {
        setUserTier(result.tier)
        return true
      }
      return false
    } catch (error) {
      console.error('Restore failed:', error)
      return false
    }
  }

  const checkFeatureAccess = (feature: keyof typeof SUBSCRIPTION_TIERS.free.limits): boolean => {
    return hasFeatureAccess(userTier, feature)
  }

  const checkUsageLimit = (feature: 'recipes' | 'timelines', currentUsage: number): boolean => {
    return isWithinLimit(userTier, feature, currentUsage)
  }

  const getCurrentTier = () => {
    return SUBSCRIPTION_TIERS[userTier]
  }

  return {
    customerInfo,
    loading,
    userTier,
    purchaseHobbyPro,
    restorePurchases,
    checkFeatureAccess,
    checkUsageLimit,
    getCurrentTier,
    refresh: loadSubscriptionData
  }
}