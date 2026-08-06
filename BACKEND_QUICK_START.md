# Backend Implementation Quick Start

## What's Ready to Use

### 1. Authentication System
All auth endpoints are fully functional with Supabase:
- Sign In: `POST /api/auth/signin`
- Sign Up: `POST /api/auth/signup`
- GitHub OAuth: `GET /api/github/connect` → callback
- Forgot Password: `POST /api/auth/forgot-password`
- Reset Password: `POST /api/auth/reset-password`

### 2. Log Ingestion Pipeline
Send error logs to Snowflake:
```bash
curl -X POST https://your-domain.com/api/logs \
  -H "Authorization: Bearer tw_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "timestamp": "2026-08-06T17:00:00Z",
    "stackTrace": "Error: Cannot read property of undefined\n  at file.ts:42",
    "requestBody": {"userId": "123"},
    "responseBody": {"error": "Server error"}
  }'
```

Response:
```json
{
  "logId": "cuid...",
  "investigationId": "cuid...",
  "isDuplicate": false,
  "clusterId": "cuid...",
  "status": "queued"
}
```

### 3. LLM Provider Configuration
All 8 providers configured and ready:

**Setup Provider:**
```bash
curl -X POST https://your-domain.com/api/settings/llm \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  }'
```

**Test Provider:**
```bash
curl -X POST https://your-domain.com/api/settings/llm/test \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "apiKey": "...",
    "model": "llama3-70b-8192"
  }'
```

**Get Snippets for SDK:**
```bash
curl -X GET "https://your-domain.com/api/project/snippets?projectId=..." \
  -H "Authorization: Bearer ..."
```

Returns snippets in: cURL, JavaScript, Python, Node.js, Go

### 4. Error Clustering
Get all error clusters:
```bash
curl -X GET "https://your-domain.com/api/clusters?projectId=..." \
  -H "Authorization: Bearer ..."
```

Response includes:
- Severity: P0 (red), P1 (amber), P2 (blue), P3 (gray)
- 7-day trend array
- Occurrence count
- Investigation link

### 5. Investigation Status
Get investigation results:
```bash
curl -X GET "https://your-domain.com/api/investigations/{id}" \
  -H "Authorization: Bearer ..."
```

Contains:
- Root cause analysis
- Affected file and line number
- Unified diff patch
- Confidence score with reasoning
- Fix strategy (one_liner, refactor, etc.)

### 6. GitHub Integration
Connect GitHub repo:
```bash
# Redirect user to:
https://your-domain.com/api/github/connect?projectId=...
```

Get accessible repos:
```bash
curl -X GET "https://your-domain.com/api/github/repos?projectId=..." \
  -H "Authorization: Bearer ..."
```

### 7. Webhook Management
Register outbound webhooks:
```bash
curl -X POST https://your-domain.com/api/settings/webhooks \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "...",
    "url": "https://your-webhook.com/snowflake",
    "secret": "your-secret",
    "events": ["investigation_complete", "pr_created", "escalation"]
  }'
```

Webhooks are signed with HMAC-SHA256 (header: `X-Snowflake-Signature`)

### 8. Alerts Configuration
Setup alert channels:
```bash
curl -X POST https://your-domain.com/api/settings/alerts \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "...",
    "slackWebhookUrl": "https://hooks.slack.com/...",
    "emailAddress": "team@company.com",
    "alertOn": ["escalation", "pr_opened", "p0_error"]
  }'
```

### 9. Audit Logging
Retrieve audit trail:
```bash
curl -X GET "https://your-domain.com/api/audit?projectId=...&action=investigation_complete" \
  -H "Authorization: Bearer ..."
```

Logged actions:
- log_ingested
- investigation_queued / complete
- pr_created / merged
- reinvestigation_triggered
- escalation_fired
- api_key_regenerated
- alert_config_updated

### 10. Stats Dashboard
Get aggregated statistics:
```bash
curl -X GET "https://your-domain.com/api/stats?projectId=..." \
  -H "Authorization: Bearer ..."
```

Returns:
- totalLogs, totalInvestigations, prsOpened
- avgConfidence, duplicatesAvoided, autoFixSuccess
- topFailingEndpoints (top 5)
- errorTrend (30-day data)

### 11. Project API Keys
Get current key:
```bash
curl -X GET "https://your-domain.com/api/project/apikey?projectId=..." \
  -H "Authorization: Bearer ..."
```

Response:
```json
{
  "maskedKey": "tw_live_abc...xyz",
  "createdAt": "2026-08-06T10:00:00Z",
  "lastUsed": "2026-08-06T17:00:00Z"
}
```

Regenerate key:
```bash
curl -X POST https://your-domain.com/api/project/apikey/regenerate \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "..."
  }'
```

## WebSocket Events (Real-time Dashboard)

Connect Socket.io client:
```javascript
import io from 'socket.io-client'

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL)
socket.emit('join', projectId)

// Listen for events
socket.on('log:received', (data) => {
  console.log('New log:', data)
})

socket.on('investigation:progress', (data) => {
  console.log('Progress:', data.step, data.percent)
})

socket.on('investigation:complete', (data) => {
  console.log('Complete:', data.rootCause, data.confidence)
})

socket.on('pr:created', (data) => {
  console.log('PR created:', data.prUrl)
})

socket.on('alert:escalated', (data) => {
  console.log('Escalation:', data.reason)
})
```

## Database Models

All models available via Prisma:
```typescript
import { prisma } from '@/lib/db'

// Get project logs
const logs = await prisma.apiLog.findMany({
  where: { projectId: '...' },
  orderBy: { createdAt: 'desc' },
  take: 50
})

// Get error cluster
const cluster = await prisma.errorCluster.findUnique({
  where: { id: '...' },
  include: { logs: true, investigations: true }
})

// Get investigation details
const investigation = await prisma.investigation.findUnique({
  where: { id: '...' },
  include: { cluster: true, logs: true }
})
```

## Environment Setup

Copy and fill `.env.local`:
```
DATABASE_URL=postgresql://user:pass@localhost/snowflake
REDIS_URL=redis://localhost:6379
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_KEY=$(openssl rand -hex 32)
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Running Workers

In separate terminals:

```bash
# Investigation processor
npm run worker:investigation

# Webhook delivery
npm run worker:webhook
```

## Testing Workflow

1. **Send a log:**
   ```bash
   curl -X POST http://localhost:3000/api/logs \
     -H "Authorization: Bearer tw_live_..." \
     -d '{...}'
   ```

2. **Check cluster:**
   ```bash
   curl http://localhost:3000/api/clusters
   ```

3. **Monitor investigation:**
   ```bash
   curl http://localhost:3000/api/investigations/{id}
   ```

4. **Setup LLM provider:**
   ```bash
   curl -X POST http://localhost:3000/api/settings/llm \
     -d '{"provider":"groq","apiKey":"...","model":"llama3-70b-8192"}'
   ```

5. **Watch WebSocket events** in dashboard

6. **Check audit trail:**
   ```bash
   curl http://localhost:3000/api/audit?projectId=...
   ```

## Remaining Frontend Work

See `BACKEND_IMPLEMENTATION_STATUS.md` for:
- Patch preview component
- Dashboard stats cards and charts  
- Real-time socket client integration
- Alert routing to Slack/email
- Multi-repo detection

All backend APIs are production-ready!
