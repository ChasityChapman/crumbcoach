# Crumb Coach Changelog

## [2.0.0] - 2025-01-12

### 🚀 Major Release: RevenueCat Removal + Timeline Analytics

This release removes all subscription/paywall functionality and implements comprehensive timeline analytics to optimize the sourdough baking experience.

---

## 🗑️ RevenueCat Removal (Complete)

### Dependencies Removed
- `@revenuecat/purchases-capacitor` package
- iOS Podfile RevenueCat pod configuration  
- Android Gradle RevenueCat module references

### Files Deleted
- `client/src/lib/revenuecat.ts` - RevenueCat service wrapper
- `client/src/lib/entitlements.ts` - Subscription entitlement management
- `client/src/hooks/useSubscription.ts` - React subscription hook
- `client/src/lib/subscriptions.ts` - Subscription tier definitions
- `client/src/lib/webhook-handler.ts` - RevenueCat webhook processing
- `client/src/lib/supabase-schema.sql` - User entitlements database schema
- `supabase/functions/revenuecat-webhook/` - Complete webhook function

### Features Now Free
- **Timeline Planner**: Multi-recipe coordination (was premium)
- **Push Notifications**: All notification types (was premium) 
- **Hydration Calculator**: Advanced baking calculations (was premium)
- **Unlimited Recipes**: No recipe count restrictions (was 2 max)

### Build Impact
- **Mobile Builds**: Capacitor now shows 3 plugins (down from 4)
- **Bundle Size**: Reduced by removing RevenueCat SDK
- **Permissions**: No longer requests In-App Purchase permissions

---

## 🎯 Timeline Edge Cases Implementation

### 1. Overnight Steps (12-18 hour fermentation)
```typescript
// Features Added:
- Date badges across multiple days
- Split bedtime/morning notifications  
- Moon icons for overnight indicators
- Cross-day timeline visualization
```

**Components:**
- Enhanced `timeline-view.tsx` with date badge logic
- Split notification scheduling in `notifications.ts`
- Overnight step detection and UI indicators

### 2. Open-ended Adaptive Steps ("Until doubled")
```typescript
// Features Added:
- Photo guide component with visual cues
- Readiness check functionality
- Periodic nudge notifications
- Visual reference images (placeholder)
```

**New Component:** `adaptive-step-guide.tsx`
- Interactive visual cue carousel
- Photo capture integration (ready for implementation)
- "It's Ready!" completion workflow

### 3. Parallel Steps (Overlapping timing)
```typescript
// Features Added:
- Intelligent step grouping algorithm
- Stacked visual layout for parallel operations
- Purple visual indicators
- Overlap detection and rendering
```

**Algorithm:** Timeline step grouping with overlap detection
- Groups steps that can run simultaneously
- Visual stacking with left border indicators
- Maintains chronological order within groups

### 4. Skip Confirmation (Prevent accidental skips)
```typescript
// Features Added:
- Confirmation modal with schedule options
- Pull forward vs keep timing choices
- Impact preview for recalibration
- Warning system for important steps
```

**New Component:** `skip-confirmation-modal.tsx`
- Schedule adjustment preview
- User choice: pull earlier steps forward or keep original timing
- Warnings for long-duration steps (>60 min)

### 5. App Restoration (After device reboot)
```typescript
// Features Added:
- Notification persistence in localStorage
- Missed notification reconciliation
- Automatic rescheduling on app startup
- Recovery notifications for overdue steps
```

**Enhanced:** `notifications.ts` with restoration logic
- 30-minute grace period for overdue notifications
- Automatic cleanup of expired alerts
- Reconciliation event dispatching for UI updates

### 6. Timezone Detection (Travel support)
```typescript
// Features Added:
- Automatic timezone change monitoring
- Travel warning notifications
- Adjustment prompts for active bakes
- Visual warnings with location names
```

**New Component:** `timezone-warning-banner.tsx`
- Detects timezone changes every 5 minutes
- Page visibility change monitoring
- User-friendly location names (e.g., "New York" vs "America/New_York")

### 7. Do Not Disturb Support
```typescript
// Features Added:
- Quiet hours detection (9 PM - 7 AM)
- In-app notification banners
- Mobile DND status indicators
- Alternative notification delivery
```

**New Component:** `in-app-notification-banner.tsx`
- Colored notification banners by type
- Action buttons for immediate response
- Priority indicators for important notifications

---

## 📊 Comprehensive Timeline Analytics

### Event Tracking System
```typescript
// Events Implemented:
bake_start       // Recipe begins, timing starts
bake_complete    // Full bake finished with metrics
step_complete    // Step done with actual vs estimated time
step_skip        // Step bypassed with reason and impact
step_reopen      // Completed step revisited (future)
recalibrate_open // Recalibration sheet opened
recalibrate_apply // Timeline adjusted with mode/delta
notif_tap        // Notification responded to
notif_missed     // Opened >10 minutes late  
pause            // Timeline paused
resume           // Timeline resumed after pause
```

### Analytics Insights Available

**Recipe Optimization:**
- Steps with consistent timing drift (>10 min average)
- High skip rate steps (>20% skip rate)
- Frequently recalibrated recipes
- User completion patterns

**User Behavior:**
- Notification response times
- Recalibration frequency and patterns
- Pause/resume usage
- Step interaction patterns

**Data Storage:**
- **Local Persistence**: 1000 most recent events in localStorage
- **Export Ready**: JSON format for external analysis
- **Privacy Focused**: No data sent to external servers

### New File: `timeline-analytics.ts`
```typescript
// Key Features:
- Comprehensive event type definitions
- Local storage with automatic cleanup
- Recipe analysis with problematic step identification
- Bake analysis with completion metrics
- Export functionality for data analysis
```

---

## ✍️ Microcopy Updates (Direct, Calm Tone)

### Before vs After

| Context | Before | After |
|---------|--------|-------|
| **Empty State** | "No active bakes. Start a new bake to begin your sourdough journey" | "No active bake. Start one to get a live timeline and reminders." |
| **Recalibration** | Complex technical explanation | "We'll shift your next steps by +12 min." |
| **Pause** | Generic pause message | "Timer paused. Fermentation doesn't care—set a reminder if you step away." |
| **Missed Step** | "Running Late? Missed [Step]? Recalibrate to keep timings useful." | "[Step] is overdue. Open to recalibrate your timeline." |
| **App Restore** | Technical restoration message | "Missed: [Step] (12m ago). Open to recalibrate your timeline." |

### New Components for Messaging:
- `recalibration-banner.tsx` - Delta minute display
- `pause-message.tsx` - Calm pause guidance
- Updated notification strings throughout `notifications.ts`

---

## 🛠️ Technical Improvements

### Notification System Enhancements
- **Multiple Timing Patterns**: T-5, T-0, missed, bedtime, wakeup, adaptive
- **Debounced Scheduling**: 500ms debounce for rapid timeline changes
- **Service Worker Integration**: Better mobile notification persistence  
- **Haptic Feedback**: Different vibration patterns by notification type
- **DND Detection**: Quiet hours and mobile DND status monitoring

### Timeline Processing
- **Parallel Step Grouping**: Algorithm for overlapping step detection
- **Date Handling**: Cross-day timeline support with proper date badges
- **Adaptive Step Detection**: Keyword matching for open-ended steps
- **Schedule Recalibration**: Multiple adjustment modes (shift, compress, single)

### Mobile Optimizations
- **Touch Interactions**: Swipe gestures for step completion
- **Haptic Feedback**: iOS/Android vibration patterns
- **Responsive Design**: Better mobile layout for complex timeline views
- **Service Worker**: Enhanced background notification handling

---

## 📱 Build & Deployment Changes

### Capacitor Configuration
- **iOS**: Removed RevenueCat pod, updated dependencies
- **Android**: Removed Gradle modules and dependencies  
- **Plugins**: Now 3 plugins total (FCM, Push Notifications, Sentry)

### Package Changes
```json
// Removed:
"@revenuecat/purchases-capacitor": "^11.1.1"

// Bundle size reduced by ~200KB
// No more In-App Purchase permissions required
```

### Development Impact
- **No Subscription Logic**: Simplified state management
- **Free Features**: All premium features now available
- **Analytics Ready**: Built-in analytics for feature optimization

---

## 🧪 Testing Recommendations

### Analytics Validation
1. **Start a bake** - Verify `bake_start` event tracking
2. **Complete steps** - Check timing delta calculations
3. **Skip steps** - Confirm skip reason and pullforward tracking
4. **Pause/resume** - Validate activity state tracking
5. **Recalibrate** - Test mode detection and delta tracking
6. **Notifications** - Verify tap response time tracking

### Edge Cases Testing
1. **Overnight Steps** - Test date badges and split notifications
2. **Adaptive Steps** - Verify photo guide and readiness checks
3. **Parallel Steps** - Confirm overlap detection and visual grouping
4. **App Restoration** - Test notification reconciliation after reboot
5. **Timezone Changes** - Validate detection and warning system
6. **DND Mode** - Test in-app banner fallbacks

### Mobile Testing
1. **iOS/Android Builds** - Verify RevenueCat removal is complete
2. **Notifications** - Test all notification types and timing
3. **Haptic Feedback** - Validate vibration patterns
4. **Background Recovery** - Test app restoration scenarios

---

## 💡 Future Analytics Insights

With the new analytics system, you can now answer:

### Recipe Optimization
- **Which steps consistently take longer than estimated?**
- **Which recipes have high skip rates?** 
- **What's the average timing drift per recipe?**
- **Which steps need duration adjustments?**

### User Experience  
- **How quickly do users respond to notifications?**
- **When do users most often pause their bakes?**
- **How frequently do users need to recalibrate?**
- **What notification types are most effective?**

### App Performance
- **How often does app restoration occur?**
- **Are users experiencing missed notifications?**
- **Which edge cases are most common?**
- **How effective are the new timeline features?**

---

## 🔧 Migration Notes

### For Existing Users
- **No Action Required**: Existing bakes continue normally
- **New Features Available**: All previously premium features now free
- **Analytics Opt-in**: Analytics are automatically enabled, stored locally
- **Data Privacy**: No data sent externally, stored locally only

### For Developers  
- **RevenueCat Dependencies**: Completely removed, safe to rebuild
- **Mobile Builds**: Run `npx cap sync` to update native configurations
- **Analytics Integration**: Events automatically tracked, access via `timelineAnalytics.exportEvents()`

---

This release transforms Crumb Coach into a completely free, analytics-driven sourdough baking assistant focused on optimizing timing and improving recipe accuracy through user behavior insights.