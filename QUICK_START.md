# Snowflake - Quick Start (5 Minutes)

Get Snowflake running locally in just 5 minutes!

## TL;DR - Copy/Paste Instructions

### 1. Get Supabase Credentials (2 min)

Go to your Supabase project → **Settings** → **API**

Copy these 3 values:
```
NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

### 2. Create `.env.local`

```bash
cd /path/to/SnowFlake

# Copy template
cp .env.example .env.local
```

### 3. Generate Secrets

Run these 2 commands in terminal and copy the output to `.env.local`:

```bash
# For ENCRYPTION_KEY (run once, copy output)
openssl rand -hex 16

# For NEXTAUTH_SECRET (run once, copy output)
openssl rand -base64 32
```

### 4. Edit `.env.local`

Paste the values:
```env
# Supabase (from step 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Generated secrets (from step 3)
ENCRYPTION_KEY=<paste_hex_value>
NEXTAUTH_SECRET=<paste_base64_value>

# Add one LLM provider (free options)
# Option A: OpenAI (paid, but free tier available)
OPENAI_API_KEY=sk-...

# Option B: Groq (FREE)
GROQ_API_KEY=gsk_...

# Option C: Google Gemini (free tier)
GOOGLE_API_KEY=AIzaSy...
```

### 5. Run Database Migration

1. Go to Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy all SQL from: `migrations/001_tracewise_backend.sql`
3. Paste & Run

> **If you see pgvector error**: It's safe to ignore - it's already enabled in Supabase

### 6. Install & Run

```bash
# Install deps
npm install --legacy-peer-deps

# Start dev server
npm run dev
```

Open: **http://localhost:3000**

### 7. Create Account

Click "Sign Up", verify email, done!

---

## Multi-User Test

**Test that multiple users work independently:**

1. In normal window: Sign up with `user1@test.com`
2. In incognito window: Sign up with `user2@test.com`
3. Each user only sees their own data ✓

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Connection refused" | Check `.env.local` Supabase URL & keys |
| "Auth failed" | Use **anon (public)** key, not service role |
| "Cannot find module" | Run `npm install --legacy-peer-deps` |
| "pgvector not available" | Safe to ignore - already enabled |
| Email not arriving | Check spam folder, wait 60s |

---

## Next: Send Your First Error Log

Once logged in, get your **API Key** from:
- Click your project
- Settings → API Keys
- Copy the `sf_live_...` key

Send a test error:
```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer sf_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/test",
    "method": "GET",
    "statusCode": 500,
    "stackTrace": "Error: Database connection failed\n  at connectDB (db.js:45:23)\n  at main (server.js:12:5)"
  }'
```

Check dashboard → you should see the error!

---

## Optional: GitHub Integration

To enable auto-PR creation:

1. Create GitHub Personal Access Token:
   - Go to [github.com/settings/tokens](https://github.com/settings/tokens)
   - Generate new token (classic)
   - Scopes: `repo, admin:repo_hook`
   - Copy to `.env.local`:
     ```env
     GITHUB_TOKEN=ghp_...
     ```

2. Restart server: `npm run dev`

3. In app → Settings → Connect GitHub repo

---

## Optional: Email Alerts

To get alerts when errors happen:

1. Sign up at [resend.com](https://resend.com) (free tier)
2. Copy API key to `.env.local`:
   ```env
   RESEND_API_KEY=re_...
   ```
3. Restart server

---

## Full Setup Guide

For complete setup with production deployment, see: **SETUP.md**

Enjoy Snowflake! ❄️
