# SnowFlake Verification Repo

A tiny repo with **intentional bugs** used to verify SnowFlake's automatic
repo-monitoring workflow end-to-end.

## What this verifies

| Step | Where it happens | What you should see |
|------|------------------|---------------------|
| 1. Upload this repo to GitHub | `github.com` | Push `index.js` + `package.json` |
| 2. Connect GitHub | Settings → GitHub → CONNECT GITHUB | Avatar + login chip, repo dropdown populated |
| 3. Create an event | Settings → GitHub → AUTOMATION EVENTS → CREATE EVENT | Event appears with status `idle` → `analyzing` |
| 4. First-time analysis | Dashboard live feed / Event RUN NOW | Feed shows `event:started` → `event:progress` → `event:completed` |
| 5. Errors displayed | `/investigations/<id>` | Root Cause + Affected File + Fix Details with diff viewer |
| 6. Patch generation | `/investigations/<id>` → Changes | Green/red diff of the generated fix; EDIT PATCH button works |
| 7. Auto PR (optional) | Investigation page → VIEW PR | PR created in your repo when confidence > 80% |

## Setup

```bash
# 1. Create a repo on GitHub (e.g. "snowflake-verification"), then:
git init
git add index.js package.json
git commit -m "feat: add snowflake verification file"
git branch -M main
git remote add origin git@github.com:<you>/snowflake-verification.git
git push -u origin main
```

## Verify locally that the bugs fire

```bash
node index.js
# Expected output:
#   Bug A confirmed: Cannot read properties of null (reading 'name')
#   Bug B confirmed: price is not defined
#   Bug C output: NaN
#   Bug D output: eligible   (should be 'not eligible')
```

## In the app

1. **Settings → LLM Providers** — save an OpenAI/Anthropic/NVIDIA/other key.
2. **Settings → GitHub** — connect GitHub, pick `snowflake-verification` as the target repo.
3. **AUTOMATION EVENTS → CREATE EVENT** — name it `verify-bugs`, repo
   `snowflake-verification`, keep "Run analysis immediately" checked.
4. Watch the **Investigation feed** on the dashboard. When `event:completed`
   fires, open the investigation — SnowFlake should report the null `user`
   crash (Bug A) as root cause, list `index.js` as the affected file, and show
   a patch in the diff viewer.

> If the event shows `failed`, open the event card in Settings — the error
> message is displayed there and helps diagnose (missing LLM key, GitHub not
> connected, `auto_pr` column missing before migration `005`, etc.).

## Note

The `auto_pr` column on `github_configs` was added by migration
`005_github_configs_auto_pr.sql` — apply it in Supabase → SQL Editor if the
worker reports `column "auto_pr" does not exist` after creating an event.
