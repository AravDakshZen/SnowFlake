# Snowflake - Complete Setup & Implementation Guide

## 📋 Table of Contents
1. [Database Setup](#database-setup)
2. [All Created Pages](#all-created-pages)
3. [All API Routes](#all-api-routes)
4. [Environment Variables](#environment-variables)
5. [Multi-User Support](#multi-user-support)
6. [Next Steps](#next-steps)

---

## Database Setup

### SQL Migration with Step-by-Step Instructions
📄 **File:** `SQL_SETUP_GUIDE.md` (369 lines)

Contains **26 numbered SQL queries** to execute sequentially in Supabase SQL Editor:

- **Steps 1-7:** API Logs Table (embedding vector support)
- **Steps 8-14:** LLM Configs Table (encrypted provider keys)
- **Steps 15-20:** GitHub Configs Table (encrypted tokens)
- **Steps 21-26:** Alert Configs Table (Slack & Email)

**Key Features:**
- Row Level Security (RLS) on all tables
- User-scoped access (every user sees only their own data)
- Automatic cascade deletion
- All required indexes

---

## All Created Pages

### Dashboard
📄 **File:** `app/dashboard/page.tsx`

**Features:**
- System overview with 4 key metrics
- Real-time stats from API
- Error clusters list (clickable)
- Recent investigations feed
- Link to settings

**URL:** `/dashboard`

---

### Investigations
📄 **Files:**
- `app/investigations/page.tsx` - List view
- `app/investigations/[id]/page.tsx` - Detail view

**Features:**
- Filter by status (all/in_progress/completed/failed)
- Confidence score bars
- PR link integration
- Full investigation details including:
  - Root cause analysis
  - Affected file + line number
  - Patch diff viewer
  - Explanation from LLM
  - PR link to GitHub

**URLs:** 
- `/investigations` - List
- `/investigations/{id}` - Detail

---

### Error Clusters
📄 **Files:**
- `app/clusters/page.tsx` - List view
- `app/clusters/[id]/page.tsx` - Detail view

**Features:**
- Filter by status (open/resolved)
- Sort by (recent/event count/name)
- Cluster metrics (events, service, environment)
- One-click investigation trigger
- Fingerprint display for debugging

**URLs:**
- `/clusters` - List
- `/clusters/{id}` - Detail

---

### Settings
📄 **File:** `app/settings/page.tsx`

**Tabs:**
1. **LLM Providers**
   - Provider selector (OpenAI, Anthropic, Google, Groq, OpenRouter)
   - Model input
   - Encrypted API key storage
   - Active configurations display

2. **GitHub Integration**
   - Connect GitHub account
   - View connected repositories
   - Auto-PR creation on fixes

3. **Alerts Configuration**
   - Slack webhook URL
   - Email address
   - Alert type selector

4. **API Key Management**
   - Masked key display
   - Regenerate key option
   - Usage instructions

**URL:** `/settings`

---

## All API Routes

### 1. Logs Ingestion
**Route:** `POST /api/logs`
**Auth:** Bearer token (API key)
**Purpose:** Ingest error logs and create error clusters

---

### 2. Investigations
**Route:** `GET/POST /api/investigations`
**Purpose:** List or create investigations
**Features:** Pagination, filtering, status tracking

---

### 3. Investigation Detail
**Route:** `GET /api/investigations/[id]`
**Purpose:** Get single investigation with full analysis

---

### 4. Error Clusters
**Route:** `GET /api/clusters`
**Purpose:** List error clusters with stats

---

### 5. System Stats
**Route:** `GET /api/stats`
**Purpose:** Dashboard metrics (total logs, clusters, investigations, resolved)

---

### 6. LLM Settings
**Route:** `GET/POST /api/settings/llm`
**Purpose:** Manage LLM provider configurations

---

### 7. LLM Test Connection
**Route:** `GET /api/settings/llm/test`
**Purpose:** Test LLM provider connection

---

### 8. GitHub PR Creation
**Route:** `POST /api/github/pr`
**Purpose:** Create PR with patch from investigation

---

### 9. GitHub Repos
**Route:** `GET/POST /api/github/repos`
**Purpose:** List/configure connected repositories

---

### 10. GitHub Webhook
**Route:** `POST /api/github/webhook`
**Purpose:** Handle CI failures and re-investigation

---

### 11. Alert Configuration
**Route:** `GET/POST /api/settings/alerts`
**Purpose:** Manage Slack and email alerts

---

### 12. Project API Key
**Route:** `GET/POST /api/project/apikey`
**Purpose:** Generate and manage project API keys

---

## Environment Variables

### Required for Development

Create a `.env.local` file with:

```env
# Supabase Connection (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Encryption (generate: openssl rand -hex 16)
ENCRYPTION_KEY=your_32_character_hex_string_here

# Redis for Queue (optional for development)
REDIS_URL=redis://localhost:6379

# GitHub Configuration (optional)
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_CLIENT_ID=your_github_app_id
GITHUB_CLIENT_SECRET=your_github_app_secret

# Authentication Secret (generate: openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret_here

# Email Alerts (optional)
RESEND_API_KEY=re_your_resend_api_key

# Application URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LLM Providers (add at least one)
OPENAI_API_KEY=sk_test_...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
```

### How to Get Each Value

#### Supabase Keys
1. Go to [supabase.com](https://supabase.com) → Dashboard
2. Select your project
3. Click "Settings" → "API"
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role (secret) key** → `SUPABASE_SERVICE_ROLE_KEY`

#### Encryption Key
Run in terminal:
```bash
openssl rand -hex 16
```

#### LLM API Keys
- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic:** [console.anthropic.com](https://console.anthropic.com)
- **Google:** [ai.google.dev](https://ai.google.dev)
- **Groq:** [console.groq.com](https://console.groq.com)

---

## Multi-User Support

### ✅ Implemented Features

#### 1. User Isolation
- Every table has `user_id` column
- Row Level Security (RLS) ensures users see only their data
- Automatic user scoping in all queries

#### 2. User Authentication
- Next.js built-in auth support
- Supabase Auth integration
- Session-based login

#### 3. Project Ownership
- Users create projects
- Each project belongs to one user
- All related data (logs, investigations, clusters) scoped to project owner

#### 4. Account Persistence
Snowflake stores:
- User credentials (Supabase Auth)
- User projects
- User configurations (LLM, GitHub, alerts)
- User API keys
- User investigations & clusters

#### 5. Multi-Account Sharing (Future)
Add to `projects` table in the future:
```sql
ALTER TABLE public.projects ADD COLUMN team_id uuid;
-- Allows projects to be shared with team members
```

### How Data Isolation Works

**Example:** User A and User B both have logs

```sql
-- User A can only see their logs
SELECT * FROM api_logs 
WHERE user_id = auth.uid();  -- Only returns User A's logs

-- User B sees different data
SELECT * FROM api_logs 
WHERE user_id = auth.uid();  -- Only returns User B's logs

-- This is enforced by RLS policy:
-- "api_logs_select_own" ON api_logs FOR SELECT USING (auth.uid() = user_id);
```

---

## Next Steps

### Step 1: Database Setup ✅ (You'll Do This)
1. Open `SQL_SETUP_GUIDE.md`
2. Copy each SQL query (26 total)
3. Paste into Supabase SQL Editor
4. Run one at a time
5. Verify with provided verification query

### Step 2: Environment Setup
1. Copy `.env.example` to `.env.local`
2. Add Supabase keys
3. Add at least one LLM API key (OpenAI recommended for testing)

### Step 3: Start Application
```bash
npm run dev
```

### Step 4: Create Your First Project
1. Visit `http://localhost:3000/dashboard`
2. Create a new project
3. Get your API key from Settings

### Step 5: Send Your First Log
```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "stackTrace": "Error: Connection timeout\n  at getUserData (users.js:45)",
    "projectId": "your-project-id"
  }'
```

### Step 6: View in Dashboard
- Logs appear in `/dashboard`
- Error clusters created automatically
- Click to start investigation
- See AI-generated fixes in `/investigations`

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                    Snowflake App                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Pages (UI Layer)                                   │
│  ├─ /dashboard          (System overview)          │
│  ├─ /investigations     (List & detail)             │
│  ├─ /clusters           (Error groups)              │
│  └─ /settings           (Configuration)             │
│                                                      │
│  API Routes (Business Logic)                        │
│  ├─ /logs              (Ingestion)                  │
│  ├─ /investigations    (Analysis)                   │
│  ├─ /clusters          (Grouping)                   │
│  ├─ /settings/llm      (LLM config)                │
│  ├─ /github/pr         (Auto-fix)                   │
│  └─ /settings/alerts   (Notifications)             │
│                                                      │
│  Libraries (Utilities)                              │
│  ├─ /lib/encryption    (Key management)            │
│  ├─ /lib/fingerprint   (Error matching)            │
│  ├─ /lib/severity      (Risk scoring)              │
│  ├─ /lib/github        (PR automation)              │
│  ├─ /lib/alerts        (Notifications)              │
│  ├─ /lib/llm/          (AI providers)              │
│  └─ /lib/queue         (Background jobs)            │
│                                                      │
│  Database (Supabase PostgreSQL)                     │
│  ├─ api_logs           (Error collection)          │
│  ├─ llm_configs        (Model settings)             │
│  ├─ github_configs     (Repo access)               │
│  ├─ alert_configs      (Notifications)             │
│  ├─ investigations     (Analysis results)          │
│  ├─ clusters           (Error groups)              │
│  ├─ events             (Log entries)                │
│  └─ projects           (User projects)             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## File Structure

```
/vercel/share/v0-project/
├── app/
│   ├── dashboard/page.tsx          [NEW]
│   ├── investigations/
│   │   ├── page.tsx                [NEW]
│   │   └── [id]/page.tsx           [NEW]
│   ├── clusters/
│   │   ├── page.tsx                [NEW]
│   │   └── [id]/page.tsx           [NEW]
│   ├── settings/page.tsx            [NEW]
│   ├── api/
│   │   ├── logs/route.ts           [EXISTS]
│   │   ├── investigations/route.ts  [EXISTS]
│   │   ├── clusters/route.ts       [EXISTS]
│   │   ├── stats/route.ts          [EXISTS]
│   │   ├── settings/
│   │   │   ├── llm/route.ts        [EXISTS]
│   │   │   ├── llm/test/route.ts   [EXISTS]
│   │   │   └── alerts/route.ts     [EXISTS]
│   │   ├── github/
│   │   │   ├── pr/route.ts         [EXISTS]
│   │   │   ├── repos/route.ts      [EXISTS]
│   │   │   └── webhook/route.ts    [EXISTS]
│   │   └── project/apikey/route.ts [EXISTS]
│   └── layout.tsx                  [UPDATED]
│
├── lib/
│   ├── encryption.ts               [EXISTS]
│   ├── fingerprint.ts              [EXISTS]
│   ├── severity.ts                 [EXISTS]
│   ├── github.ts                   [EXISTS]
│   ├── alerts.ts                   [EXISTS]
│   ├── queue.ts                    [EXISTS]
│   ├── auth.ts                     [EXISTS]
│   ├── schema.ts                   [UPDATED]
│   └── llm/
│       ├── index.ts                [EXISTS]
│       └── providers/
│           ├── openai.ts           [EXISTS]
│           ├── anthropic.ts        [EXISTS]
│           ├── gemini.ts           [EXISTS]
│           ├── groq.ts             [EXISTS]
│           └── openrouter.ts       [EXISTS]
│
├── workers/
│   └── investigation.worker.ts     [EXISTS]
│
├── migrations/
│   ├── 001_tracewise_backend.sql   [UPDATED]
│   └── 002_snowflake_numbered.sql  [NEW]
│
├── .env.example                    [UPDATED]
├── SQL_SETUP_GUIDE.md              [NEW - 26 STEPS]
└── COMPLETE_SETUP.md               [THIS FILE]
```

---

## Support & Troubleshooting

### Database Issues
→ See `SQL_SETUP_GUIDE.md` Troubleshooting section

### API Issues
→ Check `/IMPLEMENTATION.md` for API documentation

### Configuration Issues
→ Verify environment variables in `.env.local`

### Performance Issues
→ Check database indexes (provided in SQL guide)

---

## Summary

✅ **Database:** 4 new tables with RLS, 11 indexes, all queries provided
✅ **Pages:** 5 new dashboard pages with real-time data
✅ **API:** 12 complete endpoints for all features
✅ **Users:** Full multi-user support with data isolation
✅ **Setup:** Step-by-step SQL guide with 26 numbered queries

**You're ready to build!** 🚀
