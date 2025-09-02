# Development Notes

## Mobile Authentication Issue Resolution (Sept 1, 2025)

### Problem Summary
- Mobile app (Android emulator) was stuck on sign-in screen after successful Supabase authentication
- Environment variables weren't being passed to Capacitor mobile builds
- Network connectivity issues preventing Supabase API calls in mobile environment

### Root Causes Identified
1. **Environment Variables Not Available**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were `undefined` in mobile builds
2. **React Hooks Error**: Early returns in `useSupabaseAuth` useEffect violated Rules of Hooks
3. **Network Connectivity**: Mobile emulator couldn't reach Supabase servers (`Failed to fetch` errors)

### Solutions Implemented

#### 1. Fixed Environment Variables for Mobile
**File**: `vite.config.ts`
- Added explicit environment variable definitions using Vite's `define` option
- Ensures variables are bundled into mobile builds:
```typescript
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
  'import.meta.env.VITE_ENABLE_DEMO_MODE': JSON.stringify(env.VITE_ENABLE_DEMO_MODE),
}
```

#### 2. Fixed React Hooks Violation
**File**: `client/src/hooks/useSupabaseAuth.ts`
- Removed early `return` statements in useEffect
- Wrapped Supabase logic in conditional without early returns
- Prevents "Rendered fewer hooks than expected" error

#### 3. Enabled Demo Mode for Development
**File**: `.env`
- Set `VITE_ENABLE_DEMO_MODE=true` for mobile testing
- Allows authentication flow testing without network dependencies
- Demo mode creates mock user/session and triggers router navigation

### Current State
- ✅ Environment variables properly injected into mobile builds
- ✅ React hooks error resolved
- ✅ Demo mode enabled for testing
- ✅ Authentication flow works in demo mode
- ⚠️ Network connectivity issues with Supabase still unresolved

### Next Steps for Production

#### 1. Resolve Network Connectivity
- **Test emulator internet access**: Verify emulator can reach external APIs
- **Check Supabase project status**: Ensure project is active and accessible
- **Configure Capacitor HTTP plugin**: May need additional configuration for external API calls
- **Test on real device**: Emulator network issues might not affect real devices

#### 2. Disable Demo Mode for Production
```bash
# In .env file:
VITE_ENABLE_DEMO_MODE=false
```

#### 3. Verify Complete Authentication Flow
Once network is resolved:
- Test real Supabase authentication
- Verify JWT tokens work with backend
- Test sign-up flow creates proper user records
- Validate session persistence across app restarts

### Mobile Build Process
```bash
# Standard mobile build and sync process:
npm run build
npx cap sync
# Then run in emulator/device
```

### Key Files Modified
- `vite.config.ts` - Environment variable injection for mobile
- `client/src/hooks/useSupabaseAuth.ts` - Hooks error fix and demo mode
- `.env` - Demo mode enabled

### Debug Commands
```bash
# View mobile console logs
adb logcat | grep "Capacitor/Console"

# View authentication debug logs
# Look for: "Supabase credentials check:", "Router state:", "Welcome to Demo Mode!"
```

## Authentication Architecture Notes

### Current Setup
- **Frontend Auth**: `useSupabaseAuth` hook manages Supabase authentication
- **Router Logic**: `App.tsx` checks `!!user` from `useSupabaseAuth` to show authenticated routes
- **No Backend Dependency**: Removed `useAuth` hook and `/api/user` endpoint for simplicity
- **Demo Mode**: Creates mock user/session when network fails

### Authentication Flow
1. User enters credentials on sign-in page
2. `signIn()` calls Supabase API (or demo mode if network fails)  
3. On success, immediately calls `setUser()` and `setSession()`
4. Router detects `!!user` and switches to authenticated routes
5. User sees main app interface

This architecture is simpler and more reliable than the previous dual-authentication system.