# Snowflake - Files & Documentation Guide

## 📖 Documentation Files (Read in this order)

### 1. **SUMMARY.txt** ← Read First (2 min)
   Overview of everything that was fixed and what you have now.
   Lists all your questions answered.

### 2. **DO_THIS_NOW.md** ← Setup (15 min)
   Step-by-step setup with copy/paste commands.
   - Exactly 7 steps
   - Exact commands to run
   - Troubleshooting table at bottom
   
   **START HERE** if you want to set up immediately.

### 3. **QUICK_START.md** ← Fast Track (5 min)
   Quick overview without all the details.
   Useful if you're experienced and just need the essentials.

### 4. **SETUP.md** ← Complete Guide (20 min read)
   Comprehensive 300+ line guide covering:
   - Phase 1: Supabase setup
   - Phase 2: Local development
   - Phase 3: First-time user setup
   - Testing multi-user
   - API integration
   - Production deployment
   - Database structure
   - Troubleshooting

### 5. **IMPLEMENTATION.md** ← Technical Details (30 min read)
   In-depth technical documentation:
   - All 11 API endpoints detailed
   - LLM provider specifics
   - Background worker flow
   - Database schema
   - Environment variables
   - API examples with curl
   - Architecture flow diagram

### 6. **README_SNOWFLAKE.md** ← Project Overview (10 min read)
   High-level project overview:
   - What is Snowflake?
   - Key features
   - Quick start reference
   - Database tables overview
   - LLM providers comparison table
   - Troubleshooting quick links
   - File structure
   - Support & documentation links

### 7. **FIXES_APPLIED.md** ← What Was Fixed (10 min read)
   Details on what was fixed from your 5 issues:
   - pgvector extension error fix
   - Multi-user support explanation
   - Supabase credentials documentation
   - Setup guide creation
   - App name change to Snowflake

## 🔧 Code Files

### Core Library Files

**`lib/encryption.ts`** (42 lines)
- AES-256-GCM encryption for API keys & tokens
- Uses environment ENCRYPTION_KEY

**`lib/auth.ts`** (40 lines)
- `getSession()` - Get authenticated user
- `setSession()` - Store user session

**`lib/fingerprint.ts`** (83 lines)
- `fingerprintStackTrace()` - Create error fingerprint
- `findDuplicateCluster()` - Find similar errors via pgvector
- `getClusterSimilarErrors()` - Fetch related errors

**`lib/severity.ts`** (82 lines)
- `calculateSeverity()` - P0-P3 scoring
- `getTrend()` - Error trend detection
- `getColorForSeverity()` - UI color mapping

**`lib/github.ts`** (177 lines)
- `GitHubClient` class for GitHub API
- `fetchFileContent()` - Get source files
- `createBranch()` - Create feature branch
- `createPullRequest()` - Open PR with patch
- `setupWebhook()` - Register for CI events

**`lib/queue.ts`** (101 lines)
- `queueInvestigation()` - Add job to queue
- `setupInvestigationProcessor()` - Register job handler
- Exponential backoff retry logic

**`lib/alerts.ts`** (154 lines)
- `sendSlackAlert()` - Slack notification
- `sendEmailAlert()` - Email via Resend
- Alert templates with formatting

### LLM Providers

**`lib/llm/index.ts`** (48 lines)
- Base `LLMProvider` interface
- Methods: `analyze()`, `embed()`, `isAvailable()`

**`lib/llm/providers/openai.ts`** (73 lines)
- OpenAI provider (GPT-4, GPT-4-Turbo, GPT-3.5)
- Token counting
- Error handling

**`lib/llm/providers/anthropic.ts`** (74 lines)
- Claude provider (Claude 3 models)
- Content block parsing
- Token limits

**`lib/llm/providers/gemini.ts`** (73 lines)
- Google Gemini provider
- Multimodal support
- Content filtering

**`lib/llm/providers/groq.ts`** (76 lines)
- Groq provider (fast, free)
- Highest throughput
- Lowest latency

**`lib/llm/providers/openrouter.ts`** (75 lines)
- OpenRouter aggregator
- Access to 100+ models
- Fallback routing

### API Routes

**`app/api/logs/route.ts`** (221 lines)
- POST: Ingest error logs
- Validation, fingerprinting, clustering
- Returns: logId, clusterId, isDuplicate

**`app/api/investigations/route.ts`** (84 lines)
- GET: List investigations (paginated)
- POST: Create investigation

**`app/api/investigations/[id]/route.ts`** (118 lines)
- GET: Investigation details with retry chain
- PATCH: Update status
- DELETE: Remove investigation

**`app/api/clusters/route.ts`** (80 lines)
- GET: All error clusters
- Returns: event counts, severity, trends

**`app/api/stats/route.ts`** (120 lines)
- GET: Dashboard statistics
- Logs, investigations, PRs, confidence metrics
- Top failing endpoints, 30-day trend

**`app/api/settings/llm/route.ts`** (136 lines)
- POST: Save LLM config (encrypted)
- GET: Fetch configured providers
- Provider selection & switching

**`app/api/settings/llm/test/route.ts`** (120 lines)
- GET: Test LLM connection
- Returns: latency, token metrics, success/failure

**`app/api/github/pr/route.ts`** (168 lines)
- POST: Create PR from investigation
- Branch creation, commit, PR opening
- Auto-labeling with "snowflake-auto-fix"

**`app/api/github/repos/route.ts`** (132 lines)
- GET: List accessible repositories
- POST: Connect specific repository
- Permission validation

**`app/api/github/webhook/route.ts`** (95 lines)
- POST: Handle GitHub webhooks
- Detect CI failures on Snowflake branches
- Trigger re-investigation

**`app/api/settings/alerts/route.ts`** (124 lines)
- POST: Save Slack/Email config
- GET: Fetch current config
- Validation for endpoints

**`app/api/project/apikey/route.ts`** (152 lines)
- GET: Fetch masked API key
- POST: Generate/regenerate key
- Format: `sf_live_XXXX...`

### Background Worker

**`workers/investigation.worker.ts`** (295 lines)
Main background job processor:
1. Fetch log from database
2. Get & decrypt LLM config
3. Fetch source files from GitHub
4. Call LLM analyze()
5. Store investigation results
6. Create PR if confidence > 80%
7. Send Slack/email alerts
8. Retry logic (max 3 attempts)

### Database

**`lib/schema.ts`** (Updated)
Complete database schema with:
- investigations (with new columns)
- api_logs (with vector embeddings)
- clusters
- llm_configs
- github_configs
- alert_configs
- All with RLS policies

**`migrations/001_tracewise_backend.sql`** (140 lines)
Migration SQL to run in Supabase:
- Create tables
- Add indexes
- Set up RLS policies
- Note: pgvector already enabled (safe to ignore error)

## 📋 Configuration Files

**`.env.example`** (Updated)
All environment variables with:
- Clear section headers
- Inline instructions
- Secret generation commands
- Example values
- Optional vs required flags

**`app/layout.tsx`** (Updated)
Root layout with:
- Updated meta tags for Snowflake
- SEO description & keywords
- Social media tags
- Font configuration

## 📦 Package Dependencies

**Dependencies Added:**
- `@ai-sdk/*` - AI provider SDKs (OpenAI, Anthropic, Google)
- `bull` - Job queue library
- `redis` - Redis client
- `crypto-js` - Encryption utilities
- `next-auth` - Authentication
- `octokit` - GitHub API client
- `socket.io`/`socket.io-client` - WebSockets
- `resend` - Email service

All specified in `package.json`

## 🗂️ Directory Structure

```
SnowFlake/
├── app/
│   ├── api/
│   │   ├── logs/
│   │   ├── investigations/
│   │   ├── clusters/
│   │   ├── stats/
│   │   ├── settings/
│   │   │   ├── llm/
│   │   │   └── alerts/
│   │   ├── github/
│   │   ├── project/apikey/
│   │   └── setup/
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── encryption.ts
│   ├── fingerprint.ts
│   ├── severity.ts
│   ├── github.ts
│   ├── queue.ts
│   ├── alerts.ts
│   ├── schema.ts
│   └── llm/
│       ├── index.ts
│       └── providers/
│           ├── openai.ts
│           ├── anthropic.ts
│           ├── gemini.ts
│           ├── groq.ts
│           └── openrouter.ts
├── workers/
│   └── investigation.worker.ts
├── migrations/
│   └── 001_tracewise_backend.sql
├── public/
├── .env.example
├── package.json
└── [Documentation files]
    ├── SUMMARY.txt
    ├── DO_THIS_NOW.md
    ├── QUICK_START.md
    ├── SETUP.md
    ├── IMPLEMENTATION.md
    ├── README_SNOWFLAKE.md
    ├── FIXES_APPLIED.md
    └── FILES_GUIDE.md (this file)
```

## 🎯 Quick Reference

### To Get Started
→ Read: `SUMMARY.txt` (2 min)
→ Then: `DO_THIS_NOW.md` (15 min setup)

### To Understand Architecture
→ Read: `IMPLEMENTATION.md`
→ Check: Diagrams in `SETUP.md`

### To Deploy to Production
→ Read: `SETUP.md` → Production Deployment section
→ Reference: `IMPLEMENTATION.md` → Environment Variables

### To Troubleshoot
→ Check: `DO_THIS_NOW.md` → Troubleshooting
→ Or: `QUICK_START.md` → Troubleshooting table
→ Or: `SETUP.md` → Troubleshooting section

### To Understand Multi-User
→ Read: `SETUP.md` → Database Structure for Multi-Users
→ Check: `FIXES_APPLIED.md` → Multi-User Support section

### To Add LLM Provider
→ Read: `IMPLEMENTATION.md` → LLM Settings API
→ Check: `lib/llm/providers/` examples
→ Reference: `.env.example`

## 📞 Support Resources

All documentation is self-contained in this repo:
- No external links required for setup
- All Supabase-specific instructions included
- All environment variable options explained
- Troubleshooting for common issues

Just follow `DO_THIS_NOW.md` step-by-step!

---

**Start here:** `SUMMARY.txt` → `DO_THIS_NOW.md` → Setup in 15 minutes ❄️
