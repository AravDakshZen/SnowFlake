# Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `ENCRYPTION_KEY` set (generate: `openssl rand -hex 16`)
- [ ] `NEXT_PUBLIC_APP_URL` set correctly
- [ ] All LLM provider keys set (at least one)

### Code Review
- [ ] All TypeScript errors resolved
- [ ] No console.error statements left
- [ ] No TODO comments in production code
- [ ] All imports are valid
- [ ] No unused variables

### Testing
- [ ] Signup with email works
- [ ] Signin with email works
- [ ] OAuth (GitHub/Google) works
- [ ] Settings page loads without 401
- [ ] LLM provider selection works
- [ ] Connection testing works
- [ ] Configuration saves correctly
- [ ] Password reset flow works

## Vercel Deployment

### 1. Connect Repository
```bash
# Push to GitHub
git add .
git commit -m "feat: auth system and LLM providers"
git push origin tracewise

# Connect to Vercel via vercel.com or CLI
vercel
```

### 2. Set Environment Variables in Vercel
Go to: Project Settings → Environment Variables

Add:
```
NEXT_PUBLIC_SUPABASE_URL=https://vryrgjoxhanwkjaptilr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ENCRYPTION_KEY=your_hex_key_here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Configure OAuth
Go to: Project Settings → OAuth Configuration

GitHub OAuth:
- [ ] Authorization callback URL: `https://your-domain.com/api/auth/callback`
- [ ] Application name: Snowflake
- [ ] Homepage URL: `https://your-domain.com`

Google OAuth:
- [ ] Redirect URIs: `https://your-domain.com/api/auth/callback`

### 4. Deploy
```bash
vercel --prod
```

### 5. Verify Deployment
- [ ] Authentication pages load
- [ ] OAuth buttons work
- [ ] Settings page accessible
- [ ] LLM providers work
- [ ] No console errors

## Production Monitoring

### Errors to Watch For
- [ ] 401 responses on protected routes
- [ ] CORS errors (check Supabase settings)
- [ ] OAuth redirect issues
- [ ] Database connection errors
- [ ] Encryption/decryption failures

### Logs to Monitor
```bash
# Check Vercel logs
vercel logs

# Check Supabase logs
# Go to: supabase.com → Project → Logs
```

### Health Checks
Daily:
- [ ] User can signup
- [ ] User can signin
- [ ] Settings page loads
- [ ] LLM providers respond

## Scaling Considerations

### Database
- Supabase PostgreSQL handles scaling automatically
- Monitor query performance
- Set up alerts for slow queries

### Authentication
- Supabase handles scaling
- Session tokens are stateless
- No additional scaling needed

### LLM Providers
- Each provider has rate limits
- Implement request queuing if needed
- Monitor API usage and costs

## Security Checklist

### Credentials
- [ ] No API keys in source code
- [ ] All keys in environment variables
- [ ] Encryption key is strong
- [ ] Keys rotated regularly

### Endpoints
- [ ] All POST endpoints validate input
- [ ] All protected endpoints check session
- [ ] CSRF tokens not needed (Supabase handles it)
- [ ] Rate limiting in place (optional)

### Data
- [ ] API keys encrypted in database
- [ ] Passwords never logged
- [ ] PII handled according to regulations
- [ ] Regular backups configured

## Performance Optimization

### Frontend
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] CSS minified
- [ ] JavaScript minified

### Backend
- [ ] Database indexes created
- [ ] Queries optimized
- [ ] Connection pooling enabled
- [ ] Caching configured

### Monitoring
- [ ] Vercel analytics enabled
- [ ] Web Vitals tracked
- [ ] Error rate < 1%
- [ ] Response time < 200ms

## Backup & Disaster Recovery

### Database
- [ ] Automated backups enabled (Supabase default)
- [ ] Test restore process
- [ ] Backup retention: 30+ days

### Code
- [ ] Source code in Git
- [ ] Main branch protected
- [ ] Release tags created
- [ ] Changelog maintained

### Configuration
- [ ] Environment variables documented
- [ ] OAuth apps backed up
- [ ] SSL certificates auto-renewed

## Post-Deployment

### Monitoring (First 24 Hours)
- [ ] Error rate normal
- [ ] No spike in 401s
- [ ] OAuth flows working
- [ ] Settings page responsive

### Monitoring (First Week)
- [ ] Database performance stable
- [ ] API response times consistent
- [ ] User signups working
- [ ] No security alerts

### Monitoring (Ongoing)
- [ ] Daily error rate check
- [ ] Weekly performance review
- [ ] Monthly security audit
- [ ] Quarterly capacity planning

## Rollback Plan

If critical issues found:

### Step 1: Identify Issue
```bash
# Check logs
vercel logs

# Check Supabase
supabase status
```

### Step 2: Quick Fix (if possible)
```bash
# Update environment variable
vercel env pull

# Fix and deploy
vercel --prod
```

### Step 3: Rollback (if needed)
```bash
# Revert to previous deployment
# Go to: Vercel Dashboard → Project → Deployments
# Click "Promote to Production" on previous working version
```

## Support Resources

### Debugging
- Check browser console (F12)
- Check Vercel logs
- Check Supabase logs
- Check application logs

### Documentation
- IMPLEMENTATION_SUMMARY.md - Technical details
- QUICKSTART.md - Setup guide
- CHANGES.md - What changed
- README_UPDATES.md - Overview

### Common Issues

**401 Unauthorized**
- Check session cookie exists
- Verify Supabase keys
- Check user authentication status

**OAuth Not Working**
- Verify redirect URLs
- Check OAuth credentials
- Test in incognito mode

**LLM Provider Errors**
- Verify API keys
- Check provider status
- Test connection first

**Database Errors**
- Check connection string
- Verify credentials
- Check network access

## Contact & Escalation

### Issues by Component
- **Auth Issues**: Check Supabase dashboard
- **LLM Issues**: Check provider status
- **Deploy Issues**: Check Vercel status
- **Database Issues**: Check Supabase support

### Support Channels
1. First: Check logs and documentation
2. Second: Check provider status pages
3. Third: Contact provider support
4. Fourth: Review recent changes

## Sign-Off

Deployment completed by: ________________
Date: ________________
Verified by: ________________

All checks passed: ☐ Yes ☐ No
