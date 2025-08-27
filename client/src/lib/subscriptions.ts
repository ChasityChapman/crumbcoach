export interface SubscriptionTier {
  id: string;
  name: string;
  features: string[];
  limits: {
    recipes: number;
    timelines: number;
    reminders: boolean;
    hydrationCalc: boolean;
  };
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    features: ['Limited recipes', 'Basic baking tracking'],
    limits: {
      recipes: 2,
      timelines: 0, // Timeline feature requires paid subscription
      reminders: false,
      hydrationCalc: false,
    }
  },
  hobby_pro: {
    id: 'hobby_pro',
    name: 'Hobby Pro',
    features: ['Timeline planner', 'Push reminders', 'Hydration calculator', 'Unlimited recipes'],
    limits: {
      recipes: -1, // unlimited
      timelines: -1, // unlimited
      reminders: true,
      hydrationCalc: true,
    }
  }
};

// Check if user has access to a feature
export function hasFeatureAccess(userTier: string, feature: keyof SubscriptionTier['limits']): boolean {
  const tier = SUBSCRIPTION_TIERS[userTier] || SUBSCRIPTION_TIERS.free;
  const limit = tier.limits[feature];
  
  if (typeof limit === 'boolean') {
    return limit;
  }
  
  return limit === -1; // unlimited
}

// Check if user is within usage limits
export function isWithinLimit(userTier: string, feature: 'recipes' | 'timelines', currentUsage: number): boolean {
  const tier = SUBSCRIPTION_TIERS[userTier] || SUBSCRIPTION_TIERS.free;
  const limit = tier.limits[feature];
  
  if (limit === -1) return true; // unlimited
  return currentUsage < limit;
}