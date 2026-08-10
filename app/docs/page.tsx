import Link from 'next/link'

export const metadata = {
  title: 'API Documentation — Snowflake',
}

export default function DocsPage() {
  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</Link>
          <Link href="/" className="text-xs text-black/40 hover:text-black transition-colors">← Back to home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-12 py-20">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>API Documentation</h1>
        <p className="text-sm text-black/40 mb-12">Send errors to Snowflake and get fixes in seconds.</p>

        <div className="space-y-12">
          {/* Authentication */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">Authentication</h2>
            <p className="text-sm text-black/60 leading-relaxed mb-4">
              All API requests require a project API key in the <code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header. Your API key starts with <code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-xs font-mono">tw_live_</code>. You can find it in Settings → API Key.
            </p>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <span className="text-white/30">Authorization:</span> Bearer tw_live_YOUR_KEY_HERE
            </div>
          </section>

          {/* POST /api/logs */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">POST /api/logs</h2>
            <p className="text-sm text-black/60 leading-relaxed mb-4">
              Send an error log to Snowflake. This will automatically fingerprint the error, cluster it, and queue an investigation if enabled.
            </p>
            <h3 className="text-sm font-medium text-black/80 mb-2">Request Body</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto mb-4">
              <pre>{`{
  "endpoint": "/api/checkout",
  "method": "POST",
  "statusCode": 500,
  "stackTrace": "TypeError: Cannot read properties of null...",
  "requestBody": { "userId": "123" },
  "responseBody": { "error": "Internal server error" },
  "projectId": "your-project-id"
}`}</pre>
            </div>
            <h3 className="text-sm font-medium text-black/80 mb-2">Response (200)</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <pre>{`{
  "ok": true,
  "logId": "uuid",
  "clusterId": "uuid",
  "isDuplicate": false,
  "investigationQueued": true
}`}</pre>
            </div>
          </section>

          {/* GET /api/investigations */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">GET /api/investigations</h2>
            <p className="text-sm text-black/60 leading-relaxed mb-4">
              List all investigations for the current project. Returns a paginated list sorted by creation date.
            </p>
            <h3 className="text-sm font-medium text-black/80 mb-2">Query Parameters</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto mb-4">
              <pre>{`?projectId=uuid       // Required
?page=1               // Page number (default: 1)
?limit=20             // Results per page (default: 20)`}</pre>
            </div>
            <h3 className="text-sm font-medium text-black/80 mb-2">Response (200)</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <pre>{`{
  "investigations": [
    {
      "id": "uuid",
      "status": "completed",
      "endpoint": "/api/checkout",
      "method": "POST",
      "status_code": 500,
      "root_cause": "Null reference on user.cart",
      "affected_file": "src/checkout.ts",
      "confidence": 94,
      "pr_url": "https://github.com/...",
      "pr_number": 42,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}`}</pre>
            </div>
          </section>

          {/* GET /api/investigations/:id */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">GET /api/investigations/:id</h2>
            <p className="text-sm text-black/60 leading-relaxed mb-4">
              Get full details of a single investigation including the issue report, patch diff, and model usage.
            </p>
            <h3 className="text-sm font-medium text-black/80 mb-2">Response (200)</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <pre>{`{
  "investigation": {
    "id": "uuid",
    "status": "completed",
    "root_cause": "...",
    "patch_diff": "--- a/src/checkout.ts\\n+++ b/src/checkout.ts\\n...",
    "issue_report": "## Issues Found\\n1. ...",
    "confidence": 94,
    "models_used": { "pass1": { "provider": "groq", "model": "llama3-70b" } },
    "pr_url": "https://github.com/...",
    "pr_number": 42
  }
}`}</pre>
            </div>
          </section>

          {/* GET /api/clusters */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">GET /api/clusters</h2>
            <p className="text-sm text-black/60 leading-relaxed mb-4">
              List all error clusters for the current project with occurrence counts and trend data.
            </p>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <pre>{`{
  "clusters": [
    {
      "id": "uuid",
      "title": "TypeError at /api/checkout",
      "severity": "P0",
      "status": "open",
      "event_count": 47,
      "trend": [5, 8, 12, 10, 15, 20, 25],
      "first_seen_at": "2025-01-01T00:00:00Z",
      "last_seen_at": "2025-01-07T12:00:00Z"
    }
  ]
}`}</pre>
            </div>
          </section>

          {/* GET /api/stats */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">GET /api/stats</h2>
            <p className="text-sm text-black/60 leading-relaxed mb-4">
              Get dashboard statistics for the current project.
            </p>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <pre>{`{
  "totalLogs": 1247,
  "activeClusters": 23,
  "totalInvestigations": 45,
  "resolvedIssues": 38,
  "avgConfidence": 91,
  "prsOpened": 42
}`}</pre>
            </div>
          </section>

          {/* Code Examples */}
          <section>
            <h2 className="text-xl font-light text-black/90 mb-4">Code Examples</h2>

            <h3 className="text-sm font-medium text-black/80 mb-2">cURL</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto mb-6">
              <pre>{`curl -X POST https://snowflakedoitforyou.vercel.app/api/logs \\
  -H "Authorization: Bearer tw_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpoint": "/api/checkout",
    "method": "POST",
    "statusCode": 500,
    "stackTrace": "TypeError: Cannot read properties of null...",
    "projectId": "YOUR_PROJECT_ID"
  }'`}</pre>
            </div>

            <h3 className="text-sm font-medium text-black/80 mb-2">JavaScript</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto mb-6">
              <pre>{`const response = await fetch(
  'https://snowflakedoitforyou.vercel.app/api/logs',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer tw_live_YOUR_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: '/api/checkout',
      method: 'POST',
      statusCode: 500,
      stackTrace: error.stack,
      projectId: 'YOUR_PROJECT_ID'
    })
  }
)`}</pre>
            </div>

            <h3 className="text-sm font-medium text-black/80 mb-2">Python</h3>
            <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm text-emerald-400/80 overflow-x-auto">
              <pre>{`import requests

requests.post(
  'https://snowflakedoitforyou.vercel.app/api/logs',
  headers={
    'Authorization': 'Bearer tw_live_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  json={
    'endpoint': '/api/checkout',
    'method': 'POST',
    'statusCode': 500,
    'stackTrace': str(e),
    'projectId': 'YOUR_PROJECT_ID'
  }
)`}</pre>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-10 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <span className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</span>
            <p className="mt-2 text-xs text-black/25">Understand what happened. Fix what matters.</p>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Docs", href: "/docs" },
              { label: "GitHub", href: "https://github.com/AravDakshZen" },
            ].map(l => (
              <a key={l.label} href={l.href} className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">{l.label}</a>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-black/[0.04]">
          <span className="text-xs text-black/20">© 2025 Snowflake. Error detection & automatic fixes.</span>
        </div>
      </footer>
    </div>
  )
}
