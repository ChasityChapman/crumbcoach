# Security Implementation Guide

This document outlines the security features implemented in CrumbCoach, including JWT authentication, rate limiting, logging, and monitoring.

## 🔐 Authentication & Authorization

### JWT Token System

The application uses JSON Web Tokens (JWT) for stateless authentication with the following features:

- **Access Tokens**: Short-lived tokens (15 minutes) for API access
- **Refresh Tokens**: Long-lived tokens (7 days) for obtaining new access tokens
- **Token Rotation**: New tokens are issued on refresh for enhanced security
- **Secure Headers**: Tokens include issuer and audience validation

### Key Features

- ✅ Secure password hashing with bcrypt
- ✅ Token-based authentication with JWT
- ✅ Automatic token refresh mechanism
- ✅ Role-based authorization (extensible)
- ✅ Session management compatibility
- ✅ Supabase integration support

## 🛡️ Rate Limiting & DDoS Protection

### Rate Limiting Rules

| Endpoint Type | Limit | Window | Description |
|---------------|-------|--------|-------------|
| General API | 1000 req | 15 min | General API usage |
| Authentication | 5 req | 15 min | Login attempts |
| Registration | 3 req | 1 hour | Account creation |
| Password Reset | 3 req | 1 hour | Password recovery |

### Progressive Delays

- **Speed Limiter**: Adds progressive delays after 100 requests
- **Maximum Delay**: 20 seconds for excessive requests
- **Bypass**: Trusted IPs can be configured to skip limits

## 📊 Logging & Monitoring

### Request Logging

All API requests are logged with:
- Request ID for tracing
- Method, URL, and response time
- Status codes with color coding (dev)
- User identification (when authenticated)
- Security-relevant headers (X-Forwarded-For, etc.)

### Security Alerts

Automatic alerts for:
- **Unauthorized Access**: 401/403 responses
- **Server Errors**: 5xx responses  
- **Rate Limit Violations**: 429 responses
- **Suspicious Requests**: Malicious patterns
- **Performance Issues**: Slow requests and memory usage

### Performance Monitoring

- **Request Metrics**: Total requests, status distribution
- **Response Times**: Average and individual tracking  
- **Memory Usage**: Heap usage and leak detection
- **Health Checks**: System status and service availability

## 🔒 Security Middleware

### Security Headers (Helmet)

- **Content Security Policy**: XSS protection
- **HSTS**: Force HTTPS connections
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME sniffing prevention

### Request Validation

- **Malicious Pattern Detection**: XSS, SQL injection attempts
- **Request Size Limiting**: 10MB maximum payload
- **IP Filtering**: Whitelist/blacklist support
- **CORS Configuration**: Controlled cross-origin access

## 🌐 Environment Configuration

### Required Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production  
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security Configuration
SESSION_SECRET=your-session-secret-change-in-production
METRICS_TOKEN=secure-token-for-metrics-access

# Optional Security Settings
TRUSTED_IPS=127.0.0.1,::1
BLACKLISTED_IPS=
WHITELISTED_IPS=
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Supabase Integration (if used)
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Production Security Checklist

- [ ] Change all default secrets and keys
- [ ] Configure HTTPS with valid SSL certificates  
- [ ] Set up proper CORS origins
- [ ] Configure trusted IP addresses
- [ ] Enable production logging
- [ ] Set up monitoring alerts
- [ ] Configure database connection limits
- [ ] Enable security headers
- [ ] Set up rate limiting
- [ ] Configure firewall rules

## 🧪 Testing Security

Run the security test suite:

```bash
# Start the server
npm run dev

# Run security tests (in another terminal)
node scripts/test-security.js
```

### Test Coverage

- ✅ JWT token generation and validation
- ✅ Authentication middleware
- ✅ Rate limiting functionality  
- ✅ Security headers
- ✅ Request validation
- ✅ Size limiting
- ✅ Suspicious request detection
- ✅ Metrics collection

## 📈 API Endpoints

### Authentication Endpoints

```http
POST /api/register          - User registration with JWT
POST /api/login             - User login with JWT
POST /api/refresh-token     - Refresh access token
POST /api/forgot-password   - Request password reset
POST /api/reset-password    - Reset password with token
DELETE /api/delete-account  - Delete user account (authenticated)
```

### Monitoring Endpoints

```http
GET /api/health            - Health check
GET /api/metrics           - Request metrics (protected)
```

## 🚨 Security Incident Response

### Alert Types and Severity

| Alert Type | Severity | Response |
|------------|----------|----------|
| Unauthorized Access | Medium | Monitor, potential IP block |
| Server Error | High | Investigate immediately |
| Rate Limit Exceeded | Medium | Monitor for patterns |
| Suspicious Request | High | Block IP, investigate |
| Data Breach Attempt | Critical | Immediate action required |

### Monitoring Integration

For production deployment, integrate with:
- **Logging**: ELK Stack, Splunk, or CloudWatch
- **Monitoring**: DataDog, New Relic, or Prometheus
- **Alerting**: PagerDuty, Slack, or email notifications
- **Security**: SIEM tools and threat detection

## 🛠️ Development vs Production

### Development Mode
- Detailed console logging with colors
- Less strict rate limiting
- Debug information in responses
- Relaxed CORS settings

### Production Mode
- Structured JSON logging
- Strict security policies
- Generic error messages
- Monitoring service integration
- Enhanced rate limiting

## 📚 References

- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

**Note**: This security implementation provides a solid foundation but should be regularly reviewed and updated as threats evolve. Consider regular security audits and penetration testing for production systems.