# BrainSait Doctor Hub - Cloudflare Worker Backend

Healthcare-compliant backend API for the BrainSait Doctor Hub, deployed on Cloudflare Workers with KV storage.

## 🚀 Features

- ✅ **Authentication & Sessions** - Secure user authentication with session management
- ✅ **Encrypted Storage** - AES-GCM encryption for PHI data
- ✅ **Audit Logging** - HIPAA/PDPL compliant audit trail
- ✅ **Patient Management** - CRUD operations for patient records
- ✅ **Health Checks** - Monitoring endpoints for uptime tracking
- ✅ **CORS Support** - Configurable cross-origin requests
- ✅ **Rate Limiting** - Protection against abuse

## 📋 Prerequisites

1. **Cloudflare Account** - [Sign up](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI** - Install globally:
   ```bash
   npm install -g wrangler
   ```
3. **Authentication** - Login to Cloudflare:
   ```bash
   wrangler login
   ```

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Configure Environment Variables

Copy the example file:
```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your values:
```bash
API_KEY=your-strong-api-key-here
ENCRYPTION_KEY=your-encryption-key-32-chars-minimum
ENVIRONMENT=development
```

### 3. Create KV Namespaces

Create the required KV namespaces:

```bash
# Production namespaces
wrangler kv:namespace create "PATIENTS_KV"
wrangler kv:namespace create "AUDIT_KV"
wrangler kv:namespace create "SESSIONS_KV"

# Preview namespaces (for local dev)
wrangler kv:namespace create "PATIENTS_KV" --preview
wrangler kv:namespace create "AUDIT_KV" --preview
wrangler kv:namespace create "SESSIONS_KV" --preview
```

Update `wrangler.toml` with the returned IDs:
```toml
[[kv_namespaces]]
binding = "PATIENTS_KV"
id = "your-namespace-id-here"
preview_id = "your-preview-id-here"
```

## 🧪 Development

Start the local development server:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

Test the health endpoint:
```bash
curl http://localhost:8787/health
```

## 📦 Deployment

### Deploy to Staging

```bash
npm run deploy:staging
```

### Deploy to Production

```bash
npm run deploy:production
```

### Configure Production Secrets

Set production environment variables:

```bash
# API Key
wrangler secret put API_KEY --env production

# Encryption Key (32+ characters)
wrangler secret put ENCRYPTION_KEY --env production
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Authentication
```
POST /api/auth/login
POST /api/auth/mfa/verify
GET  /api/auth/validate
POST /api/auth/logout
```

### Storage
```
PUT    /api/storage/:key
GET    /api/storage/:key
DELETE /api/storage/:key
DELETE /api/storage/clear
```

### Audit Logging
```
POST /api/audit/log
GET  /api/audit/events
GET  /api/audit/stats
GET  /api/audit/export
```

### Patient Management
```
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
```

## 🔒 Security Features

### Encryption
- **Algorithm**: AES-GCM 256-bit
- **Key Management**: Environment variable (migrate to KMS for production)
- **Scope**: All PHI data encrypted at rest

### Authentication
- **Sessions**: Stored in KV with expiration
- **Tokens**: 64-character random tokens
- **Timeout**: Configurable (default 30 minutes)

### Audit Logging
- **Events**: All PHI access logged
- **Retention**: 90 days in KV (archive for 6+ years per HIPAA)
- **Fields**: User, action, resource, timestamp, outcome, details

### Rate Limiting
- Configured in `wrangler.toml`
- Prevents abuse and DoS attacks

## 📊 Monitoring

### View Logs
```bash
npm run tail
```

### Metrics
Access Cloudflare Dashboard → Workers → Analytics

### Critical Events
Query audit logs for critical events:
```bash
curl -H "Authorization: Bearer <token>" \
  https://your-worker.workers.dev/api/audit/events?severity=critical
```

## 🔧 Configuration

### Frontend Integration

Update your frontend `.env.local`:
```bash
VITE_API_BASE_URL=https://your-worker-name.workers.dev
VITE_API_KEY=your-api-key
VITE_ENVIRONMENT=production
VITE_BACKEND_AUTH_ENABLED=true
VITE_ENCRYPTED_STORAGE_ENABLED=true
VITE_AUDIT_LOGGING_ENABLED=true
```

### CORS

Edit `ALLOWED_ORIGINS` in `wrangler.toml`:
```toml
[vars]
ALLOWED_ORIGINS = "https://brainsait.github.io,https://your-domain.com"
```

## 📝 Demo Credentials

For development/testing:
- **Username**: `demo`
- **Password**: `demo123`
- **MFA Code**: `123456`

**⚠️ Change these in production!**

## 🚨 Production Checklist

Before deploying to production:

- [ ] Generate strong `API_KEY` (32+ characters)
- [ ] Generate strong `ENCRYPTION_KEY` (32+ characters)
- [ ] Set production secrets with `wrangler secret put`
- [ ] Update `ALLOWED_ORIGINS` to production domains
- [ ] Configure KV namespace IDs in `wrangler.toml`
- [ ] Enable Cloudflare WAF rules
- [ ] Set up monitoring alerts
- [ ] Review audit log retention policy
- [ ] Test all endpoints in staging
- [ ] Document incident response plan
- [ ] Complete security audit
- [ ] HIPAA compliance review

## 🛡️ Compliance Notes

### HIPAA
- ✅ Audit logging for all PHI access
- ✅ Encryption at rest (AES-GCM)
- ✅ Encryption in transit (TLS)
- ⚠️ Migrate to Business Associate Agreement (BAA) with Cloudflare
- ⚠️ Archive audit logs for 6+ years (currently 90 days in KV)

### PDPL (Saudi Arabia)
- ✅ Data subject access controls
- ✅ Audit trail for data processing
- ✅ Encryption of sensitive data
- ⚠️ Data residency requirements (verify Cloudflare region)

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage](https://developers.cloudflare.com/kv/)
- [Hono Framework](https://hono.dev/)

## 🆘 Support

For issues or questions:
1. Check Worker logs: `wrangler tail`
2. Review Cloudflare Dashboard metrics
3. Test locally with `npm run dev`
4. Verify environment variables are set

## 📄 License

PRIVATE - BrainSait Healthcare Solutions
