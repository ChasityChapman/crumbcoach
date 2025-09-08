# Deployment Environment Configuration

## Required Environment Variables

For successful deployment, ensure all production environments (CI/CD, hosting platforms, etc.) have these variables configured:

### Core Supabase Configuration
```bash
# Supabase URL - REQUIRED
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anon Key - REQUIRED  
SUPABASE_KEY=your_supabase_anon_key_here

# Supabase Service Role Key - REQUIRED for admin operations
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database URL - REQUIRED
DATABASE_URL=postgresql://postgres:your_password@db.your-project-id.supabase.co:5432/postgres
```

### Client-Side Variables (for Vite)
```bash
# Client-side Supabase URL - REQUIRED for frontend
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Client-side Supabase Anon Key - REQUIRED for frontend
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Security Configuration
```bash
# Session secret - REQUIRED for authentication
SESSION_SECRET=your_secure_random_session_secret_here

# Metrics token - REQUIRED for monitoring
METRICS_TOKEN=your_secure_metrics_token_here
```

### Optional Configuration
```bash
# Environment
NODE_ENV=production

# Security settings
TRUSTED_IPS=your_trusted_ip_addresses
ALLOWED_ORIGINS=https://your-domain.com

# AI Services (if using)
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## Platform-Specific Instructions

### Vercel Deployment
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all required variables above
4. Deploy or redeploy your application

### Railway Deployment
1. Go to your Railway project
2. Navigate to "Variables" tab
3. Add all required variables above
4. Railway will auto-deploy on changes

### Docker/Container Deployment
Create a `.env.production` file with all variables, or pass them as `-e` flags:

```bash
docker run -e SUPABASE_URL=... -e SUPABASE_KEY=... your-app:latest
```

### GitHub Actions/CI
Add all variables to your repository secrets:
1. Go to repository Settings
2. Navigate to "Secrets and variables" → "Actions"
3. Add each variable as a secret

## Validation

The application will validate required environment variables on startup and throw descriptive errors if any are missing:

- `SUPABASE_URL` - Critical error if missing
- `SUPABASE_KEY` - Critical error if missing  
- `SUPABASE_SERVICE_ROLE_KEY` - Warning if missing (admin features may not work)

## Security Notes

⚠️ **NEVER commit environment files with real credentials to version control**

✅ **DO:**
- Use placeholder values in `.env.example` files
- Store real credentials in deployment platform's secret management
- Rotate credentials regularly
- Use different credentials for different environments

❌ **DON'T:**
- Hard-code credentials in source code
- Commit `.env` files with real values
- Share credentials in chat/email
- Use production credentials in development

## Testing Your Configuration

Run the deployment readiness check:
```bash
curl https://your-app-url.com/api/deployment-status
```

This endpoint will verify all required environment variables are present and the application can connect to services.