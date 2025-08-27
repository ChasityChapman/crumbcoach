import { useState, useEffect } from 'react'
import { CustomerInfo } from '@revenuecat/purchases-capacitor'
import { revenueCat } from '@/lib/revenuecat'
import { SUBSCRIPTION_TIERS, hasFeatureAccess, isWithinLimit } from '@/lib/subscriptions'

export function useSubscription() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<'free' | 'hobby_pro'>('free')

  useEffect(() => {
    loadCustomerInfo()
  }, [])

  const loadCustomerInfo = async () => {
    try {
      const info = await revenueCat.getCustomerInfo()
      setCustomerInfo(info)
      if (info) {
        const tier = revenueCat.getUserTier(info)
        setUserTier(tier)
      }
    } catch (error) {
      console.error('Failed to load customer info:', error)
    } finally {
      setLoading(false)
    }
  }

  const purchaseHobbyPro = async (): Promise<boolean> => {
    try {
      const result = await revenueCat.purchasePackage('hobby_pro_monthly')
      if (result) {
        setCustomerInfo(result)
        setUserTier(revenueCat.getUserTier(result))
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
      const result = await revenueCat.restorePurchases()
      if (result) {
        setCustomerInfo(result)
        setUserTier(revenueCat.getUserTier(result))
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
    refresh: loadCustomerInfo
  }
}