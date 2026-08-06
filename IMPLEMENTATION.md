# Snowflake Backend Implementation

## ✅ Completed Implementation

### 1. Database Schema Updates
All new tables have been defined in the updated `lib/schema.ts`:
- **api_logs** - Stores logs with pgvector embeddings for error fingerprinting
- **llm_configs** - LLM provider configuration (encrypted API keys)
- **github_configs** - GitHub repository connection settings
- **alert_configs** - Slack/Email alert configuration
- **investigations** - Investigation results with patch diffs, PR links, re-attempt tracking

Run the migration SQL to update your database:
```bash
# Copy migrations/001_tracewise_backend.sql content and run in Supabase SQL Editor
```

### 2. Core Libraries Implemented

#### Encryption (`lib/encryption.ts`)
- AES-256-GCM encryption for sensitive data (API keys, GitHub tokens)
- Key requirement: `ENCRYPTION_KEY` env var (32 hex characters)

#### LLM Provider Abstraction (`lib/llm/`)
- **Base Interface**: Unified `LLMProvider` interface for all providers
- **Providers Implemented**:
  - OpenAI (GPT-4, GPT-4-Turbo, GPT-3.5-Turbo)
  - Anthropic (Claude models)
  - Google Gemini
  - Groq (fast, free tier)
  - OpenRouter (routes to multiple models)

Each provider implements:
- `analyze()` - Generate AnalysisResult with root cause, affected file, patch
- `embed()` - Generate 1536-dim vector embeddings
- `isAvailable()` - Test connection

#### Error Fingerprinting (`lib/fingerprint.ts`)
- `fingerprintStackTrace()` - Create consistent fingerprint from stack trace
- `findDuplicateCluster()` - Query pgvector for similar errors (cosine similarity threshold)
- `getClusterSimilarErrors()` - Fetch related errors in a cluster

#### Severity Scoring (`lib/severity.ts`)
- P0-P3 severity calculation based on:
  - Occurrence count (log scale)
  - Recency weight (exponential decay)
  - Status code weight (5xx > 4xx)
- Trend detection (rising/falling/stable)
- Color-coded severity stats

#### GitHub Integration (`lib/github.ts`)
- `GitHubClient` class wrapping Octokit
- File fetching, branch creation, commits, PR creation
- PR labeling with "snowflake-auto-fix"
- Webhook registration

#### Queue System (`lib/queue.ts`)
- Bull + Redis for background investigations
- `InvestigationJob` interface for job payload
- `queueInvestigation()` - Add job to queue
- `setupInvestigationProcessor()` - Register job handler
- Exponential backoff retry strategy (3 attempts)

#### Alerting (`lib/alerts.ts`)
- Slack alerts with Block Kit formatting
- Email alerts via Resend with HTML templates
- Escalation alerts after failed investigations
- Payload includes: root cause, affected file, confidence, PR link

#### Authentication Helper (`lib/auth.ts`)
- `getSession()` - Retrieve user session from cookies
- `setSession()` - Store user session

### 3. API Routes Implemented

#### Log Ingestion (`/api/logs`)
- **POST** - Ingest error logs with validation
- Validates API key via Bearer token
- Generates embedding via configured LLM
- Finds duplicate clusters using pgvector
- Creates or updates cluster
- Queues investigation if status >= 400 and not duplicate
- Returns: `{ logId, clusterId, isDuplicate, status }`

#### Investigations (`/api/investigations`)
- **GET** - Paginated list of investigations with details
- **GET** `/[id]` - Full investigation details with re-attempt chain
- **PATCH** `/[id]` - Update investigation status

#### Error Clusters (`/api/clusters`)
- **GET** - All clusters with event counts, severity scores, trends

#### Statistics (`/api/stats`)
- Total logs, investigations, PRs opened, avg confidence
- Duplicates avoided count
- Top 5 failing endpoints
- 30-day error trend chart data

#### LLM Settings (`/api/settings/llm`)
- **POST** - Save LLM provider config (encrypted key)
- **GET** - Fetch configured providers
- **GET** `/test` - Test LLM connection with latency/token metrics

#### GitHub Integration (`/api/github`)
- **POST** `/pr` - Create PR from investigation results
  - Creates branch, commits patch, opens PR with full context
  - Auto-labels with "snowflake-auto-fix"
- **GET** `/repos` - List accessible repositories
- **POST** `/repos` - Connect specific repo
- **POST** `/webhook` - Handle GitHub webhooks
  - Detects CI failures on Snowflake branches
  - Triggers re-investigation (max 3 attempts)

#### Alert Configuration (`/api/settings/alerts`)
- **POST** - Save Slack webhook and/or email
- **GET** - Fetch current alert config

#### Project API Keys (`/api/project/apikey`)
- **GET** - Fetch masked API key
- **POST** - Generate/regenerate API key
- Format: `sf_live_XXXX...` (hex for Snowflake)

### 4. Background Worker (`workers/investigation.worker.ts`)

Processes investigation jobs:
1. Fetches log from database
2. Gets LLM config and decrypts API key
3. Fetches source files from GitHub (if configured)
4. Calls LLM `analyze()` with:
   - Stack trace
   - Source file context
   - Previous attempt details (for re-investigations)
5. Stores investigation result in database
6. Auto-creates PR if confidence > 80%
7. Sends Slack/email alerts
8. On failure, sends escalation alert

### 5. Environment Variables Required

```
# Database
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Redis
REDIS_URL=redis://...

# Encryption (generate: openssl rand -hex 16)
ENCRYPTION_KEY=<32_hex_chars>

# Email (Resend)
RESEND_API_KEY=re_...

# URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# LLM Provider Keys (add as needed)
OPENAI_API_KEY=sk_test_...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
```

---

## 📋 Remaining Work (Frontend + Testing)

The following components need to be built/connected:

### Frontend Components to Build:
1. **Live Feed Panel** - Real-time event stream with Socket.io
2. **Investigations Table** - List with status, confidence badges, "View Patch" modal
3. **Cluster View** - Severity badges, trend sparklines
4. **Stats Bar** - Animated counters
5. **LLM Provider Selector** - Settings UI for choosing/testing providers
6. **GitHub Connect** - OAuth and repo selection UI

### Integration Points:
- Socket.io connection for live event streaming
- Fetch data from all `/api/*` endpoints
- WebSocket events:
  - `log:received`
  - `log:fingerprinted`
  - `investigation:queued`
  - `investigation:progress`
  - `investigation:complete`
  - `ci:watching`
  - `ci:failed_reinvestigating`
  - `alert:escalated`

### Database Setup:
1. Run the migration SQL from `migrations/001_tracewise_backend.sql`
2. Enable pgvector extension (Supabase does this automatically)
3. Create initial API key for projects

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Run database migrations**:
   - Copy SQL from `migrations/001_tracewise_backend.sql`
   - Paste into Supabase SQL Editor
   - Execute

4. **Start Redis** (required for queue):
   ```bash
   redis-server
   ```

5. **Start dev server**:
   ```bash
   npm run dev
   ```

6. **Start investigation worker** (in separate terminal):
   ```bash
   node -r tsx workers/investigation.worker.ts
   ```

---

## 📝 API Examples

### Ingest a Log
```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer sf_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "stackTrace": "Error: ...",
    "projectId": "uuid"
  }'
```

### Get Investigations
```bash
curl http://localhost:3000/api/investigations?projectId=uuid&page=1&limit=20
```

### Create PR from Investigation
```bash
curl -X POST http://localhost:3000/api/github/pr \
  -H "Content-Type: application/json" \
  -d '{
    "investigationId": "uuid",
    "projectId": "uuid"
  }'
```

---

## 🔗 Architecture Flow

```
Error Log → POST /api/logs → pgvector fingerprinting
    ↓
Find duplicate cluster or create new one
    ↓
Queue investigation job (Bull)
    ↓
Worker processes investigation:
  1. Fetch LLM config
  2. Fetch source files from GitHub
  3. Call LLM analyze()
  4. Store results
  5. Auto-create PR (if confidence > 80%)
    ↓
Send alerts (Slack/Email)
    ↓
Dashboard receives WebSocket events and updates in real-time
```

---

## 📦 Dependencies Added

- `bull` - Job queue
- `redis` - Redis client
- `crypto-js` - Encryption utilities
- `next-auth` - Authentication
- `octokit` - GitHub API client
- `socket.io` / `socket.io-client` - WebSockets
- `resend` - Email service
- `@ai-sdk/*` - AI SDK providers

---

## ✨ Key Features Implemented

✅ Log ingestion API with validation
✅ pgvector-based error fingerprinting & duplicate detection
✅ Multi-provider LLM abstraction (OpenAI, Anthropic, Gemini, Groq, OpenRouter)
✅ Stack trace analysis with root cause identification
✅ Automatic patch generation
✅ GitHub integration (branch creation, PR opening, webhook handling)
✅ Re-investigation loop with CI failure detection
✅ Severity scoring (P0-P3)
✅ Alert system (Slack + Email)
✅ API key management
✅ Background job processing with Bull + Redis
✅ Full encryption for sensitive data

---

Next steps: Connect the frontend dashboard components to these APIs and WebSocket events!
