# Deployment Guide

## Production Checklist

### Pre-Deployment
- [ ] All tests pass (`npm run typecheck`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Build completes successfully (`npm run build`)
- [ ] Environment variables configured
- [ ] Supabase Edge Functions deployed
- [ ] Razorpay webhook configured
- [ ] Database migrations applied

### Security Checks
- [ ] JWT secrets rotated
- [ ] API keys secured (Supabase, Razorpay)
- [ ] RLS policies enabled on all tables
- [ ] CORS properly configured
- [ ] SSL certificate installed
- [ ] Rate limiting enabled

### Performance Optimization
- [ ] Images optimized (WebP, lazy loading)
- [ ] Bundle size analyzed (`npm run build`)
- [ ] Lighthouse score >85
- [ ] Service Worker configured
- [ ] Cache strategy implemented

## Deployment Platforms

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Features:**
- Auto-deployment on push to main
- Environment variables in Vercel dashboard
- Built-in analytics
- Automatic scaling

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

**Steps:**
1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

### Docker (Self-Hosted)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Environment Variables (Production)

```env
# Supabase
VITE_SUPABASE_URL=prod_url
VITE_SUPABASE_ANON_KEY=prod_key

# Razorpay (Production Mode)
VITE_RAZORPAY_KEY_ID=prod_key_id

# Analytics
VITE_GOOGLE_ANALYTICS_ID=prod_id

# Sentry (Error Tracking)
VITE_SENTRY_DSN=your_sentry_dsn
```

## Post-Deployment

### Verification
1. Test all payment flows
2. Verify email notifications
3. Check admin dashboard functionality
4. Test mobile responsiveness
5. Monitor error logs (Sentry)

### Monitoring
- Setup uptime monitoring (StatusPage.io)
- Configure alerts for errors >1% rate
- Monitor database performance
- Track API response times

### Rollback Procedure
```bash
# If issues found
git revert <commit_sha>
git push origin main
# Vercel/Netlify auto-redeploys
```

## CI/CD Pipeline (GitHub Actions)

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## Scaling

### Database
- Use read replicas for analytics queries
- Enable caching (Redis)
- Archive old logs

### Frontend
- CDN for static assets
- Image optimization service (Cloudinary)
- Service Worker caching

### Backend
- Horizontal scaling via containers
- Load balancing
- Rate limiting per user/IP

## Support
For deployment issues:
- Check platform docs
- Review error logs (Sentry)
- Contact platform support
