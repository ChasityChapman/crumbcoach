import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";

export function initSentry() {
  // Only initialize if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not provided - skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out development errors in production
      if (import.meta.env.MODE === 'development') {
        return event;
      }
      
      // Only send errors in production/mobile builds
      return Capacitor.isNativePlatform() ? event : null;
    },
    beforeSendTransaction(event) {
      // Only track performance in production
      return import.meta.env.MODE === 'production' ? event : null;
    }
  });
}

export { Sentry };