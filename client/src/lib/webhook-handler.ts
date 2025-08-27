// RevenueCat Webhook Handler for real-time entitlement updates
// This would typically run as a Supabase Edge Function or server endpoint

import { createClient } from '@supabase/supabase-js';

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    id: string;
    event_timestamp_ms: number;
    app_user_id: string;
    aliases?: string[];
    product_id: string;
    period_type?: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    environment: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    is_family_share?: boolean;
    country_code?: string;
    app_id: string;
    offer_code?: string;
    tax_percentage?: number;
    commission_percentage?: number;
    currency?: string;
    price?: number;
    price_in_purchased_currency?: number;
    subscriber_attributes?: Record<string, any>;
    store?: string;
  };
}

/**
 * Process RevenueCat webhook events and sync entitlements to Supabase
 * This function should be deployed as a Supabase Edge Function
 * 
 * Example deployment:
 * supabase functions deploy revenuecat-webhook --project-ref <project-ref>
 */
export async function handleRevenueCatWebhook(
  webhookEvent: RevenueCatWebhookEvent,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { event } = webhookEvent;
  const { app_user_id, type, entitlement_ids, expiration_at_ms, product_id } = event;

  console.log(`Processing RevenueCat webhook: ${type} for user ${app_user_id}`);

  try {
    // Map app_user_id to Supabase user ID (assuming they match)
    const userId = app_user_id;

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        await handleEntitlementActivation(supabase, userId, entitlement_ids || [], expiration_at_ms, product_id);
        break;

      case 'CANCELLATION':
      case 'EXPIRATION':
        await handleEntitlementDeactivation(supabase, userId, entitlement_ids || []);
        break;

      case 'UNCANCELLATION':
        await handleEntitlementReactivation(supabase, userId, entitlement_ids || [], expiration_at_ms, product_id);
        break;

      case 'NON_RENEWING_PURCHASE':
        await handleNonRenewingPurchase(supabase, userId, entitlement_ids || [], product_id);
        break;

      default:
        console.log(`Unhandled webhook event type: ${type}`);
        break;
    }

    return { success: true, message: `Processed ${type} event for user ${userId}` };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return { success: false, error: String(error) };
  }
}

async function handleEntitlementActivation(
  supabase: any,
  userId: string,
  entitlementIds: string[],
  expirationMs: number | null | undefined,
  productId: string
) {
  const expiresAt = expirationMs ? new Date(expirationMs).toISOString() : null;

  for (const entitlementId of entitlementIds) {
    const { error } = await supabase
      .from('user_entitlements')
      .upsert({
        user_id: userId,
        entitlement_id: entitlementId,
        is_active: true,
        expires_at: expiresAt,
        product_identifier: productId,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,entitlement_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Failed to activate entitlement ${entitlementId} for user ${userId}:`, error);
    } else {
      console.log(`Activated entitlement ${entitlementId} for user ${userId}`);
    }
  }
}

async function handleEntitlementDeactivation(
  supabase: any,
  userId: string,
  entitlementIds: string[]
) {
  for (const entitlementId of entitlementIds) {
    const { error } = await supabase
      .from('user_entitlements')
      .update({
        is_active: false,
        last_updated: new Date().toISOString(),
      })
      .match({
        user_id: userId,
        entitlement_id: entitlementId
      });

    if (error) {
      console.error(`Failed to deactivate entitlement ${entitlementId} for user ${userId}:`, error);
    } else {
      console.log(`Deactivated entitlement ${entitlementId} for user ${userId}`);
    }
  }
}

async function handleEntitlementReactivation(
  supabase: any,
  userId: string,
  entitlementIds: string[],
  expirationMs: number | null | undefined,
  productId: string
) {
  const expiresAt = expirationMs ? new Date(expirationMs).toISOString() : null;

  for (const entitlementId of entitlementIds) {
    const { error } = await supabase
      .from('user_entitlements')
      .upsert({
        user_id: userId,
        entitlement_id: entitlementId,
        is_active: true,
        expires_at: expiresAt,
        product_identifier: productId,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,entitlement_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Failed to reactivate entitlement ${entitlementId} for user ${userId}:`, error);
    } else {
      console.log(`Reactivated entitlement ${entitlementId} for user ${userId}`);
    }
  }
}

async function handleNonRenewingPurchase(
  supabase: any,
  userId: string,
  entitlementIds: string[],
  productId: string
) {
  // Non-renewing purchases don't expire automatically
  for (const entitlementId of entitlementIds) {
    const { error } = await supabase
      .from('user_entitlements')
      .upsert({
        user_id: userId,
        entitlement_id: entitlementId,
        is_active: true,
        expires_at: null, // No expiration for non-renewing
        product_identifier: productId,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,entitlement_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Failed to process non-renewing purchase ${entitlementId} for user ${userId}:`, error);
    } else {
      console.log(`Processed non-renewing purchase ${entitlementId} for user ${userId}`);
    }
  }
}