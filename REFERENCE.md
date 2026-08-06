# Snowflake Platform - Quick Reference Card

## Authentication URLs

```
Sign Up:           http://localhost:3000/auth/signup
Sign In:           http://localhost:3000/auth/signin
Forgot Password:   http://localhost:3000/auth/forgot-password
Reset Password:    http://localhost:3000/auth/reset-password
Settings:          http://localhost:3000/settings
Dashboard:         http://localhost:3000/dashboard
```

## Authentication API Endpoints

```
POST /api/auth/signin
  Body: { email, password }
  Response: { success: true, user: {...} }

POST /api/auth/signup
  Body: { email, password, name }
  Response: { success: true, user: {...} }

POST /api/auth/forgot-password
  Body: { email }
  Response: { success: true }

POST /api/auth/reset-password
  Body: { token, password }
  Response: { success: true }

GET /api/auth/oauth?provider=github&callbackUrl=/dashboard
  Response: Redirects to provider login

GET /api/auth/callback?code=...&state=...
  Response: Redirects to callbackUrl with session
```

## LLM Provider Endpoints

```
GET /api/settings/llm
  Response: { configs: [{id, provider, model, base_url}] }

POST /api/settings/llm
  Body: { provider, model, apiKey?, baseUrl? }
  Response: { provider, model, status, latencyMs }

POST /api/settings/llm/test
  Body: { provider, model, apiKey?, baseUrl? }
  Response: { status, latencyMs, provider, model }
```

## Supported Providers Quick Reference

| Provider | Icon | API Key | Free | Local |
|----------|------|---------|------|-------|
| OpenAI | 🤖 | Yes | No | No |
| Anthropic | 🧠 | Yes | No | No |
| Gemini | 🔮 | Yes | No | No |
| Groq | ⚡ | Yes | Yes | No |
| NVIDIA | 🎮 | Yes | Yes* | No |
| OpenRouter | 🔀 | Yes | Yes | No |
| Ollama | 🏠 | No | Yes | Yes |

*NVIDIA offers free credits to qualified users

## Model Selection by Provider

```
OpenAI:
  - gpt-4o (recommended)
  - gpt-4-turbo
  - gpt-3.5-turbo

Anthropic:
  - claude-sonnet-4-6 (recommended)
  - claude-haiku-4-5

Google Gemini:
  - gemini-1.5-pro (recommended)
  - gemini-1.5-flash

Groq:
  - llama3-70b-8192 (fast, free)
  - mixtral-8x7b-32728

NVIDIA:
  - meta/llama-3.1-70b-instruct
  - mistralai/mixtral-8x7b

OpenRouter:
  - Multiple free and paid models available

Ollama (Local):
  - llama3 (recommended)
  - codellama
  - deepseek-coder
  - mistral
  - [any model you pull with ollama pull]
```

## Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Encryption (Required)
ENCRYPTION_KEY=your_hex_key_32_chars

# App URLs (Required)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npm run type-check

# Test LLM provider (curl)
curl -X POST http://localhost:3000/api/settings/llm/test \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","model":"llama3"}'
```

## Session Management

```typescript
// Get current session
import { getSession } from '@/lib/auth'
const session = await getSession()

// Sign out user
import { signOut } from '@/lib/auth'
await signOut()

// Get current user
import { getUser } from '@/lib/auth'
const user = await getUser()
```

## API Key Security

```
Storage:    Encrypted in database (AES-256-GCM)
Display:    Masked (first 10 + ... + last 4 chars)
Transmission: Only in POST body over HTTPS
Logging:    Never logged to console
```

## Testing Flow

```
1. Sign Up
   POST /api/auth/signup
   → Check email (if configured)
   → Create user in Supabase

2. Sign In
   POST /api/auth/signin
   → Set session cookie
   → Redirect to /dashboard

3. Access Settings
   GET /settings
   → Check session (no 401)
   → Load configs

4. Configure LLM
   POST /api/settings/llm
   → Test connection
   → Encrypt and save API key
   → Return success

5. Use LLM
   POST /api/[endpoint-that-uses-llm]
   → Fetch decrypted config
   → Initialize LLM provider
   → Execute analysis/generation
```

## Troubleshooting Quick Guide

```
Problem: 401 Unauthorized on /settings
Solution: Ensure you're signed in
         Check browser cookies for session
         Verify Supabase credentials

Problem: "Failed to connect to provider"
Solution: Verify API key is correct
         Check provider status
         Test with test endpoint first
         For Ollama: ensure running on :11434

Problem: OAuth redirect not working
Solution: Check redirect URLs in provider settings
         Verify NEXT_PUBLIC_APP_URL
         Check browser console for errors

Problem: Model dropdown empty
Solution: Refresh page
         Select a different provider
         Check browser console
         Verify provider selection works

Problem: Settings page slow to load
Solution: Check network tab
         Verify database connection
         Check Supabase status
         Look for slow queries
```

## File Locations

```
Auth Pages:
  /app/(auth)/signin/
  /app/(auth)/signup/
  /app/(auth)/forgot-password/
  /app/(auth)/reset-password/

Auth API:
  /app/api/auth/signin/
  /app/api/auth/signup/
  /app/api/auth/forgot-password/
  /app/api/auth/reset-password/
  /app/api/auth/oauth/
  /app/api/auth/callback/

Settings:
  /app/settings/
  /app/api/settings/llm/
  /app/api/settings/llm/test/
  /app/api/settings/alerts/

LLM System:
  /lib/auth.ts
  /lib/llm/index.ts
  /lib/llm/providers/
    - openai.ts
    - anthropic.ts
    - gemini.ts
    - groq.ts
    - openrouter.ts
    - nvidia.ts
    - ollama.ts
```

## Database Tables

```
Supabase Tables:
  - auth.users (Supabase managed)
  - public.llm_configs
  - public.alert_configs
  - public.project_repos
  - public.api_logs
  - public.error_clusters
  - public.investigations
```

## Security Checklist

```
✓ All API keys encrypted
✓ Session cookies secure (httpOnly, secure, sameSite)
✓ CSRF protection enabled
✓ Input validation on all endpoints
✓ Password validation (min 8 chars)
✓ Email format validation
✓ SQL injection prevention
✓ XSS protection via React
✓ Secrets not in source code
✓ Secrets not in logs
```

## Performance Tips

```
Optimization:
  - Lazy load LLM providers
  - Cache provider list
  - Debounce settings updates
  - Minimize re-renders
  - Use SWR for data fetching

Monitoring:
  - Check API response times
  - Monitor database queries
  - Track session creation
  - Monitor error rates
  - Track LLM latency
```

## Deployment Checklist

```
Before Deploying:
  ✓ All env vars set
  ✓ Signup/signin tested
  ✓ Settings page works
  ✓ LLM provider tested
  ✓ No console errors
  ✓ No TypeScript errors

Deploying:
  ✓ Push to GitHub
  ✓ Set env vars in Vercel
  ✓ Run vercel --prod
  ✓ Test all flows
  ✓ Monitor logs

After Deploy:
  ✓ Test signup
  ✓ Test signin
  ✓ Test OAuth
  ✓ Test settings
  ✓ Check error rate
```

## Support Resources

```
Documentation:
  - IMPLEMENTATION_SUMMARY.md (technical details)
  - QUICKSTART.md (setup guide)
  - CHANGES.md (what changed)
  - DEPLOYMENT.md (deployment)
  - README_UPDATES.md (overview)

External Docs:
  - Supabase: supabase.com/docs
  - Vercel: vercel.com/docs
  - Next.js: nextjs.org/docs

Example Code:
  Look in /app/(auth)/ for page examples
  Look in /app/api/auth/ for endpoint examples
  Look in /lib/llm/providers/ for provider examples
```

---

This reference card covers the essential information needed to work with the Snowflake platform. For detailed information, refer to the comprehensive documentation files.
