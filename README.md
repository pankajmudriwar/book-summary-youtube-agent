# ============================================================
# Marathi Book-Summary YouTube Agent
# ============================================================

## Overview
An autonomous daily YouTube publishing agent that creates Marathi book summary
videos with voice-cloned narration, live Devanagari captions, and automatic
YouTube uploads.

## Architecture
```
┌─────────────────────────────────────┐
│   Control Plane (Vercel + Next.js)  │
│   ┌───────────┐  ┌───────────────┐  │
│   │ Dashboard  │  │  API Routes   │  │
│   │   UI       │  │  + Cron Job   │  │
│   └───────────┘  └───────┬───────┘  │
│                          │          │
│   Gemini Script Gen ─────┤          │
│   YouTube OAuth ─────────┤          │
└──────────────────────────┼──────────┘
                           │ workflow_dispatch
┌──────────────────────────▼──────────┐
│  Media Worker (GitHub Actions)      │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Voice  │→│Caption │→│ FFmpeg │  │
│  │ Clone  │ │  Sync  │ │ Render │  │
│  └────────┘ └────────┘ └────┬───┘  │
│                              │      │
│  YouTube Upload ◄────────────┘      │
└──────────────────────────┬──────────┘
                           │
┌──────────────────────────▼──────────┐
│  Supabase (Database + Storage)      │
│  books_queue │ agent_settings       │
│  pipeline_logs │ agent-media bucket │
└─────────────────────────────────────┘
```

## Quick Start

### 1. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values:
```bash
cp .env.example .env.local
```

### 2. Install & Run Locally
```bash
npm install
npm run dev
```

### 3. Set Up Supabase
Run the migration in your Supabase SQL Editor:
```sql
-- Copy contents of supabase/migrations/001_initial_schema.sql
```

### 4. Deploy to Vercel
```bash
npx vercel --prod
```

### 5. Configure GitHub Actions Secrets
Add these secrets to your GitHub repository Settings → Secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`

### 6. Connect YouTube
Visit `/settings` on your deployed dashboard and click "Connect YouTube Channel".

### 7. Set Up Voice Cloning
See [`voice-server-template/README.md`](voice-server-template/README.md) for deploying your voice server.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Vercel + GitHub | Google AI API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + GitHub | Supabase service role key |
| `GITHUB_TOKEN` | Vercel | PAT with `repo` + `actions:write` |
| `GITHUB_REPO_OWNER` | Vercel | GitHub username or org |
| `GITHUB_REPO_NAME` | Vercel | Repository name |
| `YOUTUBE_CLIENT_ID` | Vercel + GitHub | Google OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | Vercel + GitHub | Google OAuth client secret |
| `NEXT_PUBLIC_APP_URL` | Vercel | Your deployed URL (e.g., https://your-app.vercel.app) |
| `CRON_SECRET` | Vercel | Secret for cron endpoint auth |
| `ADMIN_PASSWORD` | Vercel | Dashboard access password |

## YouTube OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web Application type)
3. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/youtube/callback`
4. Enable **YouTube Data API v3** in the API Library
5. Add your Google account as a test user in the OAuth consent screen

## License
MIT
