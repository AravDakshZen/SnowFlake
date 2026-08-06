# ❄️ Snowflake - Error Detection & Automatic Fixes

Snowflake is an **AI-powered error investigation platform** that helps engineering teams automatically detect errors, analyze root causes, and generate fixes with AI.

## What is Snowflake?

Snowflake helps you:
- 🔍 **Detect errors** from your applications in real-time
- 🧠 **Analyze root causes** using AI (OpenAI, Claude, Gemini, Groq)
- 🔧 **Generate patches** automatically
- 🚀 **Create PRs** directly with suggested fixes
- 🔔 **Alert teams** via Slack or Email
- 📊 **Track patterns** with error clustering and severity scoring

## Key Features

✅ **Multi-User Support** - Each user has completely isolated data  
✅ **Real-time Error Ingestion** - Log errors via REST API  
✅ **pgvector Fingerprinting** - Intelligent duplicate detection  
✅ **Multi-LLM Support** - OpenAI, Anthropic, Gemini, Groq, OpenRouter  
✅ **Automatic PR Creation** - High-confidence fixes automatically get PRs  
✅ **GitHub Integration** - Webhook support for CI failures  
✅ **Alert System** - Slack & Email notifications  
✅ **Re-Investigation Loop** - Improves fixes based on CI feedback  
✅ **API Key Management** - Secure project-level API keys  

## Quick Start (5 minutes)

See: **`DO_THIS_NOW.md`** for copy/paste setup instructions

## Setup Guides

Choose your path:

1. **`DO_THIS_NOW.md`** ← Start here! (5 min, step-by-step)
2. **`QUICK_START.md`** (Fast overview with common issues)
3. **`SETUP.md`** (Complete guide with production deployment)
4. **`IMPLEMENTATION.md`** (Technical architecture & API docs)
5. **`FIXES_APPLIED.md`** (What was fixed from your issues)

## Architecture

```
Your App
  ↓ sends error logs
API Endpoint: POST /api/logs
  ↓
Error Fingerprinting (pgvector)
  ↓ Finds similar errors (clustering)
Investigation Queue (Bull + Redis)
  ↓
LLM Analysis
  ├─ Fetch source files from GitHub
  ├─ Analyze stack trace
  └─ Generate patch
  ↓
Store Results
  ├─ Save investigation
  ├─ Create PR (if confidence > 80%)
  └─ Send alerts
  ↓
Dashboard
  └─ Real-time WebSocket updates
```

## API Overview

### Send Error Logs
```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer sf_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "stackTrace": "Error: ...\n  at func (file.js:10)"
  }'
```

### Get Investigations
```bash
curl http://localhost:3000/api/investigations?projectId=UUID
```

### Create PR from Investigation
```bash
curl -X POST http://localhost:3000/api/github/pr \
  -H "Content-Type: application/json" \
  -d '{
    "investigationId": "UUID",
    "projectId": "UUID"
  }'
```

See `IMPLEMENTATION.md` for all endpoints.

## Database Tables

- `api_logs` - Error logs with pgvector embeddings
- `clusters` - Grouped similar errors
- `investigations` - Analysis results with patches
- `llm_configs` - Encrypted LLM provider settings
- `github_configs` - GitHub repository connection
- `alert_configs` - Slack/Email alert settings
- `projects` - User projects
- `team_members` - Project collaboration

All tables have Row Level Security for multi-user isolation.

## Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=<generate: openssl rand -hex 16>
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
```

### LLM Providers (add at least one)
```env
GROQ_API_KEY=gsk_...           # FREE
OPENAI_API_KEY=sk_test_...     # Paid (has free trial)
ANTHROPIC_API_KEY=sk-ant-...   # Paid (has free trial)
GOOGLE_API_KEY=AIzaSy...       # Free tier available
```

### Optional
```env
GITHUB_TOKEN=ghp_...           # For auto-PR creation
RESEND_API_KEY=re_...          # For email alerts
REDIS_URL=redis://...          # For production queue
```

See `.env.example` for all options.

## Multi-User Support

Snowflake fully supports multiple users:

- Each user creates their own account
- Users are authenticated via Supabase Auth
- Data is isolated using Row Level Security (RLS)
- Each project can have team members
- All API routes verify user ownership

**Test it:** Sign up in normal window + incognito window with different emails.

## LLM Providers

Snowflake works with multiple AI providers:

| Provider | Speed | Cost | Free Tier |
|----------|-------|------|-----------|
| **Groq** | ⚡⚡⚡ (fastest) | Free | Yes ✓ |
| **OpenAI** | ⚡⚡ | $$ | Free trial |
| **Anthropic** | ⚡⚡ | $$ | Free trial |
| **Google Gemini** | ⚡⚡ | $ | Free tier |
| **OpenRouter** | ⚡⚡ | $ | Optional |

**Recommendation:** Start with Groq (free, fast), upgrade as needed.

## GitHub Integration

### Features
- ✅ Automatic branch creation
- ✅ Patch commit
- ✅ PR opening with full context
- ✅ Auto-labeling (`snowflake-auto-fix`)
- ✅ Webhook listening for CI failures
- ✅ Re-investigation on CI failure

### Setup
1. Create GitHub Personal Access Token
2. Add to `.env.local`: `GITHUB_TOKEN=ghp_...`
3. In app → Settings → Connect GitHub
4. Select repository

## Alert System

Get notified when errors are detected:

### Slack Alerts
- Real-time notifications for new errors
- Include root cause, affected file, confidence
- Link to PR (if created)

### Email Alerts
- Via Resend API
- HTML formatted
- Customizable trigger thresholds

## Background Job Processing

Investigations run in background using Bull + Redis:

- **3 attempt retry strategy** - Improves fixes on CI failure
- **Exponential backoff** - Handles transient failures
- **Priority queue** - P0 errors processed first
- **Dead letter queue** - Failed jobs logged for review

## Production Deployment

### Deploy to Vercel (Recommended)
1. Push code to GitHub
2. Create new project on Vercel
3. Set environment variables
4. Deploy

### Environment Variables for Production
- Same as development (see `.env.example`)
- Use production Supabase project
- Use production Redis (Upstash recommended)
- Use production LLM API keys

See `SETUP.md` "Production Deployment" section for details.

## Troubleshooting

### pgvector extension error
✓ **FIXED** - Supabase has it enabled by default. Error is safe to ignore.

### Multi-user not working
- Check RLS policies are enabled on all tables
- Verify `auth.uid() = user_id` in API routes
- Test with different email addresses

### API key authorization errors
- Ensure key format is `sf_live_XXXX...`
- Check key has not expired
- Verify key belongs to project

### LLM analysis failing
- Check API key is correct for provider
- Test connection in Settings → LLM
- Try different provider as backup

See `DO_THIS_NOW.md` for more troubleshooting.

## File Structure

```
SnowFlake/
├── app/
│   ├── api/
│   │   ├── logs/                 # Error ingestion
│   │   ├── investigations/        # Investigation management
│   │   ├── clusters/             # Error clustering
│   │   ├── stats/                # Dashboard stats
│   │   ├── settings/
│   │   │   ├── llm/              # LLM configuration
│   │   │   └── alerts/           # Alert configuration
│   │   ├── github/               # GitHub integration
│   │   └── project/apikey/       # API key management
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Dashboard
├── lib/
│   ├── db.ts                     # Database helpers
│   ├── auth.ts                   # Authentication
│   ├── encryption.ts             # AES-256 encryption
│   ├── fingerprint.ts            # Error fingerprinting
│   ├── severity.ts               # Severity scoring
│   ├── github.ts                 # GitHub client
│   ├── queue.ts                  # Job queue
│   ├── alerts.ts                 # Alert system
│   ├── llm/
│   │   ├── index.ts              # LLM base interface
│   │   └── providers/
│   │       ├── openai.ts         # OpenAI provider
│   │       ├── anthropic.ts      # Claude provider
│   │       ├── gemini.ts         # Google Gemini
│   │       ├── groq.ts           # Groq provider
│   │       └── openrouter.ts     # OpenRouter provider
│   └── schema.ts                 # Database schema
├── workers/
│   └── investigation.worker.ts   # Background job processor
├── migrations/
│   └── 001_tracewise_backend.sql # Database migration
├── .env.example                  # Environment template
├── DO_THIS_NOW.md                # Quick setup (START HERE!)
├── QUICK_START.md                # 5-minute setup
├── SETUP.md                      # Complete setup guide
├── IMPLEMENTATION.md             # Technical details
└── FIXES_APPLIED.md              # What was fixed
```

## Support & Documentation

- **Quick Setup:** `DO_THIS_NOW.md` ← Start here
- **API Reference:** `IMPLEMENTATION.md`
- **Production Guide:** `SETUP.md`
- **Troubleshooting:** `DO_THIS_NOW.md` → Troubleshooting section

## License

MIT

---

**Ready to get started?** Open `DO_THIS_NOW.md` and follow the 5-minute setup! ❄️
