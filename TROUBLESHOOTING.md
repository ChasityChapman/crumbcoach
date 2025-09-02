# Troubleshooting Guide

This comprehensive guide covers solutions to common issues encountered in Crumb Coach development and deployment.

## Authentication Issues

### 1. "useSupabaseAuth must be used within an AuthProvider"

**Symptoms**:
- Error thrown when component tries to use authentication
- App crashes on load or when accessing auth features

**Cause**: Component is not wrapped by AuthProvider

**Solution**:
```typescript
// Ensure AuthProvider wraps your component tree in App.tsx
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>  {/* This must wrap everything */}
        <QueryClientProvider client={queryClient}>
          <Router />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

### 2. Login Navigation Stuck / Infinite Spinner

**Symptoms**:
- Successful login but remains on login page
- Loading spinner never disappears
- No navigation to home screen

**Cause**: Isolated auth state between components

**Solution**: ✅ **Fixed** - Now uses shared AuthContext
- AuthPage and Router now share same authentication state
- Demo mode properly updates global state
- Navigation happens immediately after auth state change

### 3. "Rendered fewer hooks than expected"

**Symptoms**:
- App crashes after login
- React error boundary triggers
- Hooks violation errors in console

**Cause**: Early returns in components before all hooks executed

**Solution**: ✅ **Fixed** - Replaced early returns with conditional rendering
```typescript
// Before (causes error)
if (user) return <Loading />;
const [state, setState] = useState();

// After (works correctly)  
const [state, setState] = useState();
return user ? <Loading /> : <AuthForm />;
```

### 4. Demo Mode Not Working

**Symptoms**:
- Network errors don't fallback to demo mode
- Authentication fails completely offline

**Causes & Solutions**:

#### Missing Environment Variable
```bash
# Add to .env or environment
VITE_ENABLE_DEMO_MODE=true
```

#### Production Safety
Demo mode is disabled in production for security:
```typescript
const isDemoModeAllowed = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'
```

#### Network Detection
Demo mode only activates on actual network failures, not invalid credentials.

#### TypeError Crashes in Demo Mode
**Symptoms**:
- "TypeError: D is not a function" after demo login
- App crashes when navigating to home page
- React Error Boundary triggers after offline login

**Solution**: ✅ **Fixed** - Implemented comprehensive safe query system:
```typescript
// Before: Direct queries fail in demo mode
const { data: bakes } = useQuery({
  queryFn: bakeQueries.getAll, // ❌ Crashes offline
});

// After: Safe queries with demo fallbacks
const { data: bakes } = useQuery({
  queryFn: safeBakeQueries.getAll, // ✅ Works offline
});
```

**Technical Details**:
- **Root Cause**: Components calling undefined Supabase query functions in offline mode
- **Fix**: Created `client/src/lib/safeQueries.ts` with fallback wrappers
- **Coverage**: Updated all 6+ components and 13+ query calls
- **Result**: Complete offline functionality with realistic demo data

### 5. Authentication Loops

**Symptoms**:
- Constantly redirecting between login and home
- Auth state flickering
- "P is not a function" errors

**Cause**: Multiple auth hook instances with different states

**Solution**: ✅ **Fixed** - Single AuthContext provides consistent state across app

## Performance Issues

### 1. Frame Drops / "Skipped X frames!"

**Symptoms**:
- Choreographer warnings in Android logs
- UI lag and poor performance
- Battery drain

**Causes & Solutions**:

#### Heavy Re-renders
✅ **Fixed** - Applied memoization:
```typescript
// Expensive computations now memoized
const expensiveValue = useMemo(() => calculation(data), [data]);
const callback = useCallback(() => handler(), [deps]);
```

#### Aggressive Data Fetching
✅ **Fixed** - Optimized queries:
```typescript
// Before: staleTime: 0 (always refetch)
// After: staleTime: 5 * 60 * 1000 (5 minutes)
```

#### Missing Hook Dependencies
✅ **Fixed** - Proper dependency arrays:
```typescript
useEffect(() => {
  // Effect logic
}, []) // Empty for mount-only, or specific deps
```

### 2. Memory Leaks

**Symptoms**:
- Increasing memory usage over time
- App slowing down after extended use

**Solution**: ✅ **Fixed** - Proper cleanup patterns:
```typescript
useEffect(() => {
  let mounted = true;
  
  const asyncOperation = async () => {
    const result = await operation();
    if (mounted) setState(result); // Only if still mounted
  };
  
  return () => { mounted = false; }; // Cleanup
}, [deps]);
```

### 3. Excessive Network Requests

**Symptoms**:
- High data usage
- Battery drain
- Slow app responses

**Solution**: ✅ **Fixed** - Smart caching and conditional queries:
```typescript
// Only query when needed
enabled: !!user && condition,
staleTime: 5 * 60 * 1000, // Don't refetch for 5 minutes
refetchOnWindowFocus: false, // Reduce unnecessary requests
```

## Service Worker Issues

### 1. Service Worker Registration Failed (404)

**Symptoms**:
- Console error: "Failed to register ServiceWorker"
- 404 error for `/sw.js`

**Solution**: ✅ **Fixed** - Corrected service worker path:
```typescript
// Before
navigator.serviceWorker.register('/sw.js')

// After
navigator.serviceWorker.register('/service-worker.js')
```

### 2. Push Notifications Not Working

**Symptoms**:
- Notifications fail to display
- Service worker registration succeeds but notifications fail

**Cause**: Missing Firebase configuration or permissions

**Solution**:
1. Configure Firebase properly
2. Add real `google-services.json`
3. Request notification permissions
4. Enable FCM in Firebase Console

## Mobile Development Issues

### 1. White Screen on Android

**Symptoms**:
- App loads but shows blank white screen
- No errors in console
- Loading indicators don't appear

**Debugging Steps**:

#### Check Network Connection
```bash
# Test development server from emulator
adb shell am start -a android.intent.action.VIEW -d "http://10.0.2.2:5000"
```

#### Use Static Build
```bash
# Eliminate network issues
npm run build
npx cap sync android
```

#### Clear App Data
Android Settings > Apps > Crumb Coach > Storage > Clear Data

#### Check Logs
```bash
# Monitor for JavaScript errors
adb logcat | grep -i capacitor
adb logcat | grep com.crumbcoach.com
```

### 2. Live Reload Not Working

**Symptoms**:
- Changes not reflected on device
- Must manually refresh app

**Solutions**:

#### Verify Environment Variables
```bash
export CAPACITOR_DEV_SERVER=true
export NODE_ENV=development
```

#### Check Network Configuration
```typescript
// Ensure capacitor.config.ts has correct server URL
server: {
  url: 'http://10.0.2.2:5000', // Android emulator
  // or 'http://localhost:5000' for iOS simulator
}
```

#### Firewall Issues
- Ensure port 5000 is allowed through firewall
- Check if antivirus is blocking connections

### 3. Build Failures

**Symptoms**:
- Gradle build errors
- Capacitor sync failures
- Missing dependencies

#### Duplicate Capacitor Dependency (Dex Merge Error)
**Symptoms**:
- "com.getcapacitor.AndroidProtocolHandler is defined multiple times"
- "Dex merge failed: multiple dex files define"
- Build aborts during dexing phase

**Solution**: ✅ **Fixed** - Remove duplicate Capacitor core dependency:
```gradle
// android/app/build.gradle
dependencies {
-    implementation "com.capacitorjs:core:7.4.3"  // ❌ Remove this
+    implementation project(':capacitor-android')  // ✅ Use project reference
    // ... other dependencies
}
```

**Technical Details**:
- **Root Cause**: Both direct JAR (`com.capacitorjs:core`) and project (`:capacitor-android`) included
- **Fix**: Use only the project reference, not the direct dependency
- **Result**: Clean build without class conflicts

**Solutions**:

#### Clean and Rebuild
```bash
npx cap clean
rm -rf node_modules dist
npm install
npm run build
npx cap sync
```

#### Android Studio Issues
```bash
# In Android Studio terminal
./gradlew clean
./gradlew build
```

#### Plugin Conflicts
```bash
# Reinstall Capacitor plugins
npm uninstall @capacitor/core @capacitor/cli
npm install @capacitor/core @capacitor/cli
npx cap sync
```

## Database & API Issues

### 1. Supabase Connection Failures

**Symptoms**:
- Network errors in console
- Authentication always falls back to demo mode
- Data not loading

**Debugging**:

#### Verify Credentials
```typescript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

#### Test Connection
```bash
# Test API endpoint
curl https://your-project.supabase.co/rest/v1/
```

#### Check Environment
- Ensure `.env` file is in project root
- Variables must start with `VITE_`
- Restart dev server after changing environment variables

### 2. CORS Errors

**Symptoms**:
- "Access to fetch blocked by CORS policy"
- Network requests failing from browser

**Solution**: Configure Supabase allowed origins:
1. Go to Supabase Dashboard
2. Settings > API
3. Add your domains to CORS origins

### 3. Query Failures

**Symptoms**:
- Data not loading
- Empty results
- Network timeouts

**Debugging**:
```typescript
// Add error logging to queries
const { data, error, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onError: (error) => console.error('Query failed:', error),
});
```

## Environment & Configuration

### 1. Environment Variables Not Loading

**Symptoms**:
- `undefined` values for environment variables
- Features not working as expected

**Solutions**:

#### Check File Location
- `.env` must be in project root (next to `package.json`)
- Variables must start with `VITE_`

#### Restart Development Server
```bash
# Environment changes require restart
npm run dev
```

#### Verify Loading
```typescript
// Debug environment variables
console.log('All env vars:', import.meta.env);
```

### 2. Build Environment Differences

**Symptoms**:
- Works in development but fails in production
- Features missing in built app

**Solutions**:

#### Check Build Environment
```bash
# Ensure environment variables are available at build time
npm run build 2>&1 | grep -i env
```

#### Use Static Environment Files
Create `client/.env.production` for production-specific variables.

#### Verify Build Output
```bash
# Check if environment variables are included in build
grep -r "VITE_" dist/
```

## Testing & Debugging

### 1. Console Logging Not Visible

**Symptoms**:
- `console.log` statements not appearing
- Difficult to debug mobile issues

**Solutions**:

#### Android Chrome DevTools
1. Open Chrome
2. Go to `chrome://inspect`
3. Find your device/emulator
4. Click "inspect"

#### Enable USB Debugging
1. Enable Developer Options on Android
2. Enable USB Debugging
3. Connect device and trust computer

#### iOS Safari Inspector
1. Enable Web Inspector on iOS device
2. Connect to Safari > Develop > [Device Name]

### 2. Hot Reload Issues

**Symptoms**:
- Changes require manual refresh
- Development server not updating

**Solutions**:

#### Check File Watchers
```bash
# Increase file watcher limit on Linux/macOS
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
```

#### Clear Vite Cache
```bash
rm -rf node_modules/.vite
npm run dev
```

## Production Deployment

### 1. Build Size Warnings

**Symptoms**:
- Bundle size too large warnings
- Slow app loading

**Solutions**:

#### Code Splitting
```typescript
// Use dynamic imports for large components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

#### Bundle Analysis
```bash
npx vite-bundle-analyzer dist
```

### 2. Performance in Production

**Symptoms**:
- Slower than development
- High memory usage

**Solutions**:

#### Enable Production Optimizations
✅ **Already Applied**:
- Component memoization
- Query optimization  
- Proper tree shaking
- Minification enabled

#### Test with Production Build
```bash
npm run build
npm run preview  # Test production build locally
```

## Quick Diagnostic Commands

### Check System Health
```bash
# Verify all dependencies
npm ls

# Check for security issues
npm audit

# Verify build works
npm run build

# Test mobile sync
npx cap sync android
```

### Monitor Performance
```bash
# Android performance monitoring
adb logcat | grep -E "(Choreographer|Performance)"

# Memory usage
adb shell dumpsys meminfo com.crumbcoach.com
```

### Debug Network Issues
```bash
# Test connectivity from emulator
adb shell ping google.com

# Check if dev server is reachable
adb shell wget -q -O- http://10.0.2.2:5000
```

## Getting Help

### Log Collection
When reporting issues, include:

1. **Console Logs**: Browser console output
2. **Android Logs**: `adb logcat | grep com.crumbcoach.com`
3. **Environment Info**: Node version, OS, device details
4. **Steps to Reproduce**: Exact sequence that causes issue

### Common Log Patterns
```bash
# Authentication issues
adb logcat | grep -i "auth\|supabase\|demo"

# Performance issues  
adb logcat | grep -i "choreographer\|skipped.*frames"

# Network issues
adb logcat | grep -i "network\|fetch\|cors"

# React issues
adb logcat | grep -i "hooks\|render\|react"
```

This troubleshooting guide should help resolve the majority of issues encountered during development and deployment of Crumb Coach.