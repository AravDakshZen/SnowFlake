# DO THIS NOW - Snowflake Setup (Copy & Paste)

Follow these exact steps in order. Copy/paste each command.

---

## STEP 1: Get Supabase Credentials (2 minutes)

1. Open your Supabase project
2. Click **Settings** (bottom left)
3. Click **API**
4. **COPY these 3 values and save to notepad:**

```
Your Project URL:    https://xxxx-xxxx-xxxx.supabase.co
Your anon Key:       eyJhbGciOiJIUzI1NiIs...
Your service_role:   eyJhbGciOiJIUzI1NiIs...
```

---

## STEP 2: Generate Secret Keys (30 seconds)

Open terminal and **copy/paste these commands one at a time:**

**Command 1:**
```bash
openssl rand -hex 16
```
**→ Copy the output, save as `ENCRYPTION_KEY`**

**Command 2:**
```bash
openssl rand -base64 32
```
**→ Copy the output, save as `NEXTAUTH_SECRET`**

---

## STEP 3: Create `.env.local` File (1 minute)

In your project directory, create file: `.env.local`

**Copy/paste this exact content:**

```env
# Supabase (from Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx-xxxx-xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Generated Keys (from Step 2)
ENCRYPTION_KEY=<paste_your_hex_from_step2_command1>
NEXTAUTH_SECRET=<paste_your_base64_from_step2_command2>

# Pick ONE of these LLM providers (add your API key)

# Option A: Groq (FREE - fastest)
GROQ_API_KEY=gsk_your_groq_key_here

# Option B: Google Gemini (free tier)
# GOOGLE_API_KEY=AIzaSyXXX...

# Option C: OpenAI (paid, but has free trial)
# OPENAI_API_KEY=sk_test_XXX...

# Redis (optional, skip for development)
# REDIS_URL=redis://localhost:6379

# URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

**Replace:**
- `https://xxxx-xxxx-xxxx.supabase.co` with your Project URL from Step 1
- `eyJhbGciOiJIUzI1NiIs...` with your anon Key from Step 1
- `eyJhbGciOiJIUzI1NiIs...` (second one) with your service_role Key from Step 1
- `<paste_your_hex...>` with output from Step 2 Command 1
- `<paste_your_base64...>` with output from Step 2 Command 2
- Pick ONE LLM provider and add its key (or create free account)

---

## STEP 4: Run Database Migration (2 minutes)

1. Go to Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open: `/vercel/share/v0-project/migrations/001_tracewise_backend.sql`
5. Copy ALL the SQL
6. Paste into Supabase SQL Editor
7. Click **Run**

**Expected result:** Green checkmark ✓

> If you see error about pgvector: **IGNORE IT** - it's already enabled

---

## STEP 5: Install Dependencies (2 minutes)

**Copy/paste in terminal:**

```bash
cd /vercel/share/v0-project
npm install --legacy-peer-deps
```

Wait for it to finish (you'll see "added X packages")

---

## STEP 6: Start Development Server (30 seconds)

**Copy/paste in terminal:**

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.2.0
- Local:        http://localhost:3000
```

---

## STEP 7: Create Your Account (1 minute)

1. Open browser: **http://localhost:3000**
2. Click "Sign Up"
3. Enter your email
4. Create password
5. Check your email (or spam folder)
6. Click verification link
7. Done! You're in ✓

---

## TEST: Multi-User Setup

1. In this window: You're User 1 (logged in)
2. Open **incognito window** (Ctrl+Shift+N)
3. Go to http://localhost:3000
4. Sign up with **different email** as User 2
5. Each user should see completely different data ✓

---

## TEST: Send Your First Error

1. Click on your project
2. Go to **Settings**
3. Click **API Keys**
4. Copy your key: `sf_live_XXXX...`
5. Open terminal and **copy/paste this:**

```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer sf_live_XXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "stackTrace": "Error: Database connection timeout\n  at connectDB (db.js:45:23)\n  at query (db.js:120:5)"
  }'
```

**Replace** `sf_live_XXXX` with your actual API key

6. Go back to dashboard → should see your error!

---

## TROUBLESHOOTING

**"Connection refused" error:**
- Check your `.env.local` has correct Supabase URL
- Make sure you copied the full URL (including https://)

**"Invalid API key" error:**
- Make sure you used the **anon (public)** key, not service_role
- The keys look similar - double-check the name in Supabase

**"Cannot find module" error:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Email not arriving:**
- Check spam folder
- Wait 60 seconds
- Check Supabase Auth logs: Dashboard > Auth > Users

**pgvector error in SQL:**
- **Safe to ignore** - it's already enabled in Supabase
- Continue with setup, everything will work

---

## NEXT: Optional Setup

### Add GitHub Integration (for auto-PR creation)
1. Create GitHub Personal Access Token: https://github.com/settings/tokens
2. Generate new token (classic)
3. Scopes: Check `repo` and `admin:repo_hook`
4. Copy token
5. Add to `.env.local`:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   ```
6. Restart: `npm run dev`

### Add Email Alerts (for Slack/Email notifications)
1. Sign up: https://resend.com (free tier)
2. Copy API key
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_key_here
   ```
4. Restart: `npm run dev`

---

## You're Done! 🎉

Your Snowflake instance is now:
- ✅ Running on http://localhost:3000
- ✅ Supporting multiple users
- ✅ Ready to receive error logs
- ✅ Ready for AI analysis of errors

**Total time: ~15 minutes**

For advanced setup and production deployment, see: `SETUP.md`

For technical details, see: `IMPLEMENTATION.md`

Happy debugging! ❄️
