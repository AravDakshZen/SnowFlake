# Snowflake - Complete Setup Guide

Snowflake is a multi-user error analysis and investigation platform that helps teams automatically detect, investigate, and fix errors in their applications.

## ✅ Multi-User Support

**Yes, Snowflake fully supports multiple users!** Here's how:

- Each user logs in via Supabase Authentication
- Every user has isolated data using Row Level Security (RLS)
- Users can create and manage their own projects
- Each project can have multiple team members with role-based access
- All API routes verify the authenticated user via `auth.uid()`

---

## Step-by-Step Setup Process

### Phase 1: Supabase Setup (5 minutes)

#### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose name: "Snowflake"
5. Create a strong password (save it!)
6. Select your region (closest to you)
7. Wait for project creation (~1 minute)

#### Step 2: Get Your Supabase Credentials
From Supabase Dashboard:

1. **Settings** (bottom left) > **API**
2. Copy these values and save them:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role (secret) key** → `SUPABASE_SERVICE_ROLE_KEY`

#### Step 3: Run Database Migration
1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire SQL from: `migrations/001_tracewise_backend.sql`
4. Paste it into the SQL editor
5. Click "Run"
6. You should see: ✓ All queries executed successfully

> **Note**: pgvector is already enabled in Supabase, so if you see any extension errors, they can be safely ignored (it's already active).

---

### Phase 2: Local Development Setup (10 minutes)

#### Step 1: Clone & Install Dependencies
```bash
# Navigate to project directory
cd /path/to/SnowFlake

# Install dependencies
npm install --legacy-peer-deps

# If npm fails, try:
npm install --force
```

#### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in these REQUIRED values:
   ```env
   # From Supabase (copied in Phase 1, Step 2)
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx-xxxx-xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
   
   # Generate encryption key
   ENCRYPTION_KEY=<generate below>
   
   # Generate auth secret
   NEXTAUTH_SECRET=<generate below>
   
   # Add at least ONE LLM provider (for AI analysis)
   OPENAI_API_KEY=sk_test_...
   # OR
   ANTHROPIC_API_KEY=sk-ant-...
   # OR
   GOOGLE_API_KEY=AIzaSy...
   ```

#### Step 3: Generate Required Secrets
Run these commands in terminal to generate secure keys:

**For ENCRYPTION_KEY:**
```bash
openssl rand -hex 16
# Output example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
# Copy this to ENCRYPTION_KEY
```

**For NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
# Output example: aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/=
# Copy this to NEXTAUTH_SECRET
```

#### Step 4: Optional Configuration
These are optional but recommended:

**GitHub Integration** (for auto-PR creation):
1. Create a GitHub Personal Access Token:
   - Go to [github.com/settings/tokens](https://github.com/settings/tokens)
   - Click "Generate new token" (classic)
   - Scopes: `repo, admin:repo_hook`
   - Copy token to `GITHUB_TOKEN`

**Resend Email** (for alerts):
1. Sign up at [resend.com](https://resend.com)
2. Copy your API key to `RESEND_API_KEY`

**Redis** (optional, for production job queue):
- For development: Skip this (in-memory queue is used)
- For production: Get a Redis URL from [Upstash](https://upstash.com) or run locally

#### Step 5: Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

### Phase 3: First Time User Setup (2 minutes)

#### When you open the app:
1. Click "Sign Up" / "Create Account"
2. Enter email and password
3. Verify your email (check inbox/spam)
4. You'll be redirected to dashboard

#### Your account is now set up with:
- ✅ Isolated data (only you can see it)
- ✅ Ready to create your first project
- ✅ Other users can independently create accounts

---

## Testing Multi-User Setup

To test that multiple users work independently:

1. **User 1 Setup**: Complete Phase 3 above
2. **Open Incognito Window**: Press `Ctrl+Shift+N` (Chrome) or `Cmd+Shift+N` (Mac)
3. **User 2 Sign Up**: In incognito window, go to [http://localhost:3000](http://localhost:3000)
   - Click Sign Up
   - Use different email
   - Create account
4. **Verify Isolation**: Each user should only see their own projects/data

---

## API Integration

To send logs from your application to Snowflake:

```javascript
// In your app (React/Next.js/Node)
const sendErrorLog = async (error) => {
  const response = await fetch('http://localhost:3000/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_API_KEY` // Get from Project Settings
    },
    body: JSON.stringify({
      endpoint: '/api/users',
      method: 'GET',
      statusCode: 500,
      stackTrace: error.stack,
      requestBody: { /* ... */ },
      responseBody: { /* ... */ }
    })
  });
  
  const investigation = await response.json();
  console.log('Investigation created:', investigation.id);
};
```

Get your API key from: **Project Settings** > **API Keys**

---

## Troubleshooting

### "pgvector extension not available"
- ✅ **FIXED**: Supabase has this enabled by default
- The error in the SQL can be safely ignored (it's already active)
- Continue with setup

### "Connection refused" error
- Check Supabase URL is correct
- Verify credentials in `.env.local`
- Make sure you copied them exactly (no extra spaces)

### "Cannot find module" errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### "Auth failed" errors
- Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
- Make sure you have the **anon (public)** key, not the service role key

### Email verification not working
- Check spam folder
- Wait 60 seconds for email to arrive
- Check Supabase logs: **Auth** > **Users**

---

## Database Structure for Multi-Users

The system automatically isolates data using Supabase's Row Level Security:

```
auth.users              ← Managed by Supabase Auth
  ↓ (auth_users)
  
projects
  ├── user_id → auth.users (owner)
  ├── members → team_members (shared access)
  └── active_clusters

api_logs
  ├── user_id → auth.users
  ├── project_id → projects
  └── Visible only to: log creator OR project members

investigations
  ├── user_id → auth.users
  ├── project_id → projects
  └── Visible only to: investigation creator OR project members
  
llm_configs, github_configs, alert_configs
  └── All user-isolated with same RLS pattern
```

Every table has RLS policies ensuring `auth.uid() = user_id` for access.

---

## Production Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repo
5. Add environment variables (same as `.env.local`)
6. Click Deploy
7. Your app is live!

### Environment Variables for Production:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-encryption-key
NEXTAUTH_SECRET=your-auth-secret
REDIS_URL=your-redis-url (Upstash recommended)
OPENAI_API_KEY=your-openai-key
GITHUB_TOKEN=your-github-token
```

---

## Next Steps

1. ✅ Complete this setup
2. Create your first project
3. Get API key from project settings
4. Send error logs from your app
5. Snowflake will automatically:
   - Detect error patterns
   - Group similar errors into clusters
   - Analyze root causes
   - Generate fixes
   - Create pull requests
   - Send alerts

---

## Support

For issues or questions:
1. Check Supabase logs: Dashboard > **Logs** > **API**
2. Check Next.js logs: Terminal where `npm run dev` runs
3. See `IMPLEMENTATION.md` for architecture details
4. Check `.env.example` for all configuration options
