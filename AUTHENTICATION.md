# Authentication System Documentation

## Overview

Crumb Coach uses a context-based authentication system built on Supabase, with automatic fallback to demo mode for offline or development environments. The system provides shared authentication state across the entire application.

## Architecture

### AuthContext & AuthProvider
The authentication system is centralized using React Context to ensure consistent state across all components.

**Location**: `client/src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
  setDemoMode: (mockUser: any, mockSession: any) => void
}
```

### Implementation Details

#### 1. AuthProvider Setup
The `AuthProvider` wraps the entire application in `App.tsx`:

```typescript
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

#### 2. Hook Usage
Components access authentication via the `useSupabaseAuth` hook:

```typescript
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

function MyComponent() {
  const { user, signIn, signOut, loading } = useSupabaseAuth();
  // ... component logic
}
```

## Authentication Flow

### 1. Initialization
- Checks for valid Supabase credentials
- Sets up auth state listener
- Handles timeout scenarios (1 second timeout for mobile)
- Falls back to offline mode if credentials are missing

### 2. Sign In Process
1. Attempts Supabase authentication
2. On network failure, falls back to demo mode (if enabled)
3. Updates global state via context
4. All components immediately receive updated auth state

### 3. Demo Mode
Demo mode is enabled via environment variable:
```bash
VITE_ENABLE_DEMO_MODE=true
```

**Features**:
- Creates mock user and session objects
- Fully functional offline authentication
- Maintains consistent state across app
- Automatically enabled on network failures (when allowed)

### 4. Navigation Handling
The Router component uses shared auth state:

```typescript
function Router() {
  const { user, loading } = useSupabaseAuth();
  const isAuthenticated = !!user;
  
  if (loading) return <LoadingScreen />;
  
  return (
    <Switch>
      {!isAuthenticated ? (
        // Public routes
      ) : (
        // Private routes
      )}
    </Switch>
  );
}
```

## Key Fixes Applied

### 1. Shared State Solution
**Problem**: Each component had isolated auth state instances
**Solution**: Centralized context provider ensures single source of truth

### 2. React Hooks Compliance
**Problem**: Early returns in AuthPage caused hooks violations
**Solution**: Replaced early returns with conditional JSX rendering

```typescript
// Before (caused hooks violation)
if (user) {
  return <LoadingScreen />;
}
const [state, setState] = useState();

// After (hooks compliant)
const [state, setState] = useState();
return user ? <LoadingScreen /> : <AuthForm />;
```

### 3. Navigation Timing
**Problem**: Navigation occurred before auth state update
**Solution**: Context automatically triggers re-renders when state changes

## Environment Configuration

### Required Variables
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optional Variables
```bash
VITE_ENABLE_DEMO_MODE=true  # Enables demo mode fallback
```

### Credential Validation
The system validates credentials and rejects placeholder values:
- Rejects URLs containing "your-project"
- Rejects keys containing "your-anon-key"

## Demo Mode Details

### Activation Scenarios
1. Network connection failures
2. Invalid Supabase credentials
3. Supabase service unavailable
4. Explicit development setup

### Mock Data Structure
```typescript
const mockUser = {
  id: 'demo-user-123',
  email: email,
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { name: 'Demo User' },
  aud: 'authenticated',
  role: 'authenticated'
}

const mockSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser
}
```

## Security Considerations

### Production Settings
- Demo mode should be disabled in production
- Proper Supabase credentials must be configured
- Network failures will show appropriate error messages

### Development Safety
- Demo mode only activates with explicit environment variable
- Mock tokens are clearly identifiable
- All demo activity is logged to console

## Troubleshooting

### Common Issues

#### 1. "useSupabaseAuth must be used within an AuthProvider"
**Cause**: Component using hook outside of AuthProvider
**Solution**: Ensure AuthProvider wraps your component tree

#### 2. "Rendered fewer hooks than expected"
**Cause**: Early returns before all hooks
**Solution**: Use conditional rendering instead of early returns

#### 3. Authentication loops
**Cause**: Inconsistent auth state between components
**Solution**: Verify all components use the context-based hook

#### 4. Demo mode not working
**Cause**: Missing environment variable
**Solution**: Set `VITE_ENABLE_DEMO_MODE=true` in development

### Debug Logging
The system provides comprehensive logging:
- Credential validation results
- Auth state changes
- Demo mode activation
- Network failure details

## Best Practices

### 1. Hook Usage
Always use the hook within functional components:
```typescript
function MyComponent() {
  const { user, loading } = useSupabaseAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;
  return <AuthenticatedContent />;
}
```

### 2. Error Handling
Handle auth errors gracefully:
```typescript
const handleLogin = async () => {
  const result = await signIn(email, password);
  if (result.error) {
    showError(result.error.message);
  }
};
```

### 3. Demo Mode Testing
Test both online and offline scenarios:
```bash
# Test with valid credentials
VITE_SUPABASE_URL=valid-url npm run dev

# Test demo mode
VITE_ENABLE_DEMO_MODE=true npm run dev
```

## API Reference

### useSupabaseAuth Hook

#### Returns
- `user: User | null` - Current authenticated user
- `session: Session | null` - Current session
- `loading: boolean` - Authentication loading state
- `signIn(email, password)` - Sign in function
- `signUp(email, password, metadata?)` - Sign up function
- `signOut()` - Sign out function
- `resetPassword(email)` - Password reset function
- `setDemoMode(mockUser, mockSession)` - Enable demo mode

#### Methods

##### signIn(email: string, password: string)
```typescript
const result = await signIn('user@example.com', 'password');
if (result.error) {
  console.error('Login failed:', result.error.message);
} else if (result.isDemoMode) {
  console.log('Demo mode activated');
}
```

##### signUp(email: string, password: string, metadata?: Record<string, any>)
```typescript
const result = await signUp('user@example.com', 'password', {
  firstName: 'John',
  lastName: 'Doe'
});
```

##### signOut()
```typescript
const result = await signOut();
if (result.error) {
  console.error('Logout failed:', result.error.message);
}
```

This documentation covers the complete authentication system as implemented in the latest version of Crumb Coach.