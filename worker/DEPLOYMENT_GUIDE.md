# Cloudflare Worker Deployment Guide

## Step-by-Step Deployment to Production

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open your browser for authentication.

### 3. Create KV Namespaces

Run these commands and save the IDs returned:

```bash
# Production KV namespaces
wrangler kv:namespace create "PATIENTS_KV"
# Save the ID returned, e.g., id = "abc123..."

wrangler kv:namespace create "AUDIT_KV"
# Save the ID

wrangler kv:namespace create "SESSIONS_KV"
# Save the ID

# Preview KV namespaces (for development)
wrangler kv:namespace create "PATIENTS_KV" --preview
# Save the preview_id

wrangler kv:namespace create "AUDIT_KV" --preview
wrangler kv:namespace create "SESSIONS_KV" --preview
```

### 4. Update wrangler.toml

Edit `wrangler.toml` and replace the placeholder IDs:

```toml
[[kv_namespaces]]
binding = "PATIENTS_KV"
id = "YOUR_PATIENTS_KV_ID_HERE"          # Replace with actual ID
preview_id = "YOUR_PATIENTS_PREVIEW_ID"   # Replace with preview ID

[[kv_namespaces]]
binding = "AUDIT_KV"
id = "YOUR_AUDIT_KV_ID_HERE"
preview_id = "YOUR_AUDIT_PREVIEW_ID"

[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "YOUR_SESSIONS_KV_ID_HERE"
preview_id = "YOUR_SESSIONS_PREVIEW_ID"
```

### 5. Set Production Secrets

Generate strong keys and set them as secrets:

```bash
# Generate a strong API key (example using openssl)
openssl rand -base64 32

# Set it as a secret
wrangler secret put API_KEY --env production
# Paste the generated key when prompted

# Generate encryption key (32+ characters)
openssl rand -base64 32

# Set it as a secret
wrangler secret put ENCRYPTION_KEY --env production
# Paste the generated key
```

### 6. Configure Production Variables

Edit `wrangler.toml` under `[env.production]`:

```toml
[env.production]
name = "brainsait-doctor-hub-api-production"
vars = {
  ENVIRONMENT = "production",
  ALLOWED_ORIGINS = "https://your-frontend-domain.com",
  SESSION_TIMEOUT_MS = "1800000"
}
```

### 7. Deploy to Production

```bash
npm run deploy:production
```

You'll get a URL like: `https://brainsait-doctor-hub-api-production.your-subdomain.workers.dev`

### 8. Test the Deployment

```bash
# Health check
curl https://your-worker-url.workers.dev/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "environment": "production",
  "checks": {
    "kv": "ok"
  }
}

# Test authentication (should fail without API key)
curl https://your-worker-url.workers.dev/api/auth/login

# Should return 401 Unauthorized
```

### 9. Configure Custom Domain (Optional but Recommended)

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click "Triggers" tab
4. Add custom domain: `api.brainsait.sa`

### 10. Update Frontend Configuration

Update your frontend `.env.production`:

```bash
VITE_API_BASE_URL=https://your-worker-url.workers.dev
VITE_API_KEY=the-api-key-you-generated
VITE_ENVIRONMENT=production
VITE_BACKEND_AUTH_ENABLED=true
VITE_ENCRYPTED_STORAGE_ENABLED=true
VITE_AUDIT_LOGGING_ENABLED=true
```

### 11. Enable Monitoring

In Cloudflare Dashboard:
1. Workers & Pages → Your Worker
2. Click "Metrics" tab
3. Set up email alerts for errors

Tail logs in real-time:
```bash
wrangler tail --env production
```

### 12. Security Hardening

#### Enable WAF (Web Application Firewall)

1. Cloudflare Dashboard → Security → WAF
2. Create custom rules:
   - Block traffic from non-healthcare IPs (if using VPN)
   - Rate limit authentication endpoints
   - Block suspicious user agents

#### Enable DDoS Protection

Already included with Cloudflare Workers by default.

#### Configure Rate Limiting

Edit `wrangler.toml`:
```toml
[[unsafe.bindings]]
type = "ratelimit"
namespace_id = "brainsait_rate_limit"
```

## Production Checklist

Before going live:

### Security
- [ ] Strong API_KEY set (32+ characters)
- [ ] Strong ENCRYPTION_KEY set (32+ characters)
- [ ] ALLOWED_ORIGINS configured for production domain only
- [ ] Custom domain configured with HTTPS
- [ ] WAF rules enabled
- [ ] Rate limiting configured

### KV Namespaces
- [ ] PATIENTS_KV created and configured
- [ ] AUDIT_KV created and configured
- [ ] SESSIONS_KV created and configured
- [ ] Preview namespaces created for testing

### Testing
- [ ] Health endpoint responds
- [ ] Authentication works with demo credentials
- [ ] Storage endpoints require authentication
- [ ] Audit logging captures events
- [ ] Patient CRUD operations work
- [ ] Frontend can connect and authenticate

### Monitoring
- [ ] Error alerts configured
- [ ] Logs monitoring set up (`wrangler tail`)
- [ ] Metrics dashboard reviewed
- [ ] Audit log retention policy documented

### Compliance
- [ ] Cloudflare BAA signed (for HIPAA)
- [ ] Audit logs exported for long-term storage
- [ ] Data residency verified (Middle East region if required)
- [ ] Incident response plan documented
- [ ] Security audit completed

## Rollback Plan

If deployment fails:

```bash
# List deployments
wrangler deployments list --env production

# Rollback to previous deployment
wrangler rollback --env production
```

## Troubleshooting

### KV Namespace Not Found
- Verify IDs in `wrangler.toml` match created namespaces
- Check binding names are correct: PATIENTS_KV, AUDIT_KV, SESSIONS_KV

### 401 Unauthorized Errors
- Verify API_KEY secret is set: `wrangler secret list --env production`
- Check frontend is sending X-API-Key header
- Verify ALLOWED_ORIGINS includes your frontend domain

### CORS Errors
- Update ALLOWED_ORIGINS in `wrangler.toml`
- Redeploy after changes
- Clear browser cache

### Encryption Errors
- Verify ENCRYPTION_KEY is set
- Check key is at least 32 characters
- Test with development first

## Cost Estimate

Cloudflare Workers Free Tier:
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ First 1GB KV storage free

For production healthcare app:
- **Estimated**: $5-25/month depending on usage
- **Upgrade to Workers Paid** if you exceed free tier:
  - $5/month + $0.50 per million requests
  - Additional KV storage: $0.50/GB/month

## Support

- [Cloudflare Workers Discord](https://discord.gg/cloudflaredev)
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Community Forums](https://community.cloudflare.com/)
