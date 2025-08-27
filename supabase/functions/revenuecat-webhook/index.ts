// Supabase Edge Function for handling RevenueCat webhooks
// Deploy with: supabase functions deploy revenuecat-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookEvent: RevenueCatWebhookEvent = await req.json()
    const { event } = webhookEvent
    const { app_user_id, type, entitlement_ids, expiration_at_ms, product_id } = event

    console.log(`Processing RevenueCat webhook: ${type} for user ${app_user_id}`)

    // Map app_user_id to Supabase user ID (assuming they match)
    const userId = app_user_id

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        await handleEntitlementActivation(supabaseClient, userId, entitlement_ids || [], expiration_at_ms, product_id)
        break

      case 'CANCELLATION':
      case 'EXPIRATION':
        await handleEntitlementDeactivation(supabaseClient, userId, entitlement_ids || [])
        break

      case 'UNCANCELLATION':
        await handleEntitlementReactivation(supabaseClient, userId, entitlement_ids || [], expiration_at_ms, product_id)
        break

      case 'NON_RENEWING_PURCHASE':
        await handleNonRenewingPurchase(supabaseClient, userId, entitlement_ids || [], product_id)
        break

      default:
        console.log(`Unhandled webhook event type: ${type}`)
        break
    }

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${type} event for user ${userId}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function handleEntitlementActivation(
  supabase: any,
  userId: string,
  entitlementIds: string[],
  expirationMs: number | null | undefined,
  productId: string
) {
  const expiresAt = expirationMs ? new Date(expirationMs).toISOString() : null

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
      })

    if (error) {
      console.error(`Failed to activate entitlement ${entitlementId} for user ${userId}:`, error)
      throw error
    } else {
      console.log(`Activated entitlement ${entitlementId} for user ${userId}`)
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
      })

    if (error) {
      console.error(`Failed to deactivate entitlement ${entitlementId} for user ${userId}:`, error)
      throw error
    } else {
      console.log(`Deactivated entitlement ${entitlementId} for user ${userId}`)
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
  const expiresAt = expirationMs ? new Date(expirationMs).toISOString() : null

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
      })

    if (error) {
      console.error(`Failed to reactivate entitlement ${entitlementId} for user ${userId}:`, error)
      throw error
    } else {
      console.log(`Reactivated entitlement ${entitlementId} for user ${userId}`)
    }
  }
}

async function handleNonRenewingPurchase(
  supabase: any,
  userId: string,
  entitlementIds: string[],
  productId: string
) {
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
      })

    if (error) {
      console.error(`Failed to process non-renewing purchase ${entitlementId} for user ${userId}:`, error)
      throw error
    } else {
      console.log(`Processed non-renewing purchase ${entitlementId} for user ${userId}`)
    }
  }
}