# Environment Variables Setup

This project uses different environment files for security reasons.

## 🔐 Server-Only Secrets (NEVER ship to client)

Copy `.env.server.example` to `.env.server` and fill in these values:

- `DATABASE_URL` - Your database connection string
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access key (keep secret!)
- `SESSION_SECRET` - For server session encryption
- `METRICS_TOKEN` - For monitoring/analytics

## 🌍 Client-Safe Public Identifiers

Copy `.env.client.example` to `.env` and fill in these values:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key (safe to expose)
- `FIREBASE_API_KEY` - Firebase web API key (public)
- `FIREBASE_PROJECT_ID` - Firebase project identifier
- `FIREBASE_PROJECT_NUMBER` - Firebase project number
- `FIREBASE_MOBILE_SDK_APP_ID` - Mobile app identifier

## 📱 Firebase Mobile Configuration

Copy `android/app/google-services.json.example` to `android/app/google-services.json` and update with your Firebase project details.

## 🚀 Deployment

### Development
1. Create `.env` from `.env.client.example`
2. Create `.env.server` from `.env.server.example` 
3. Create `android/app/google-services.json` from the example

### Production
- Client variables go in your build environment
- Server secrets go in your server/CI environment only
- Never commit actual secret values to git

## ⚠️ Security Notes

- `.env.server*` files are gitignored and should never be committed
- Client variables will be bundled into your app (that's OK)
- Server secrets should only exist in secure environments
- Use GitHub repository secrets for CI/CD pipelines