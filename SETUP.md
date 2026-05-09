# Helmet.io Setup Guide

## Prerequisites

Before running the app, you need accounts and API keys from:

1. **Supabase** — [supabase.com](https://supabase.com) (free tier)
2. **Anthropic** — [console.anthropic.com](https://console.anthropic.com) (Claude API)
3. **ElevenLabs** — [elevenlabs.io](https://elevenlabs.io) (you already have this)
4. **Runware.ai** — [runware.ai](https://runware.ai) (you already have this)

---

## Step 1: Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **SQL Editor** and run the contents of `supabase/schema.sql` — this creates all tables and seeds the rules graph

4. Go to **Storage** and create these 3 buckets (all public):
   - `uploads` — for user-uploaded videos and images
   - `outputs` — for generated videos
   - `audio` — for ElevenLabs audio explanations

---

## Step 2: ElevenLabs Voice ID

1. Go to [elevenlabs.io](https://elevenlabs.io) → Voice Library
2. Choose a voice (e.g., "Rachel" or "Adam")
3. Copy the Voice ID → `ELEVENLABS_VOICE_ID`
4. Copy your API key → `ELEVENLABS_API_KEY`

---

## Step 3: Create .env.local

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=your-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
RUNWARE_API_KEY=your-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 4: Install & Run

```bash
cd helmet-io
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Token System

- Every new user gets **10,000 tokens** (auto-created on signup)
- **Legal check**: 50 tokens per run
- **Video generation**: 50 tokens per video
- Typical flow (1 check + 1 generation) = 100 tokens

---

## Architecture

```
User Input (text / text+image / video)
    ↓
Runware: Transcribe video OR Caption image → combined text
    ↓
Lawyer Agent (Claude + Rules Graph from Supabase)
    ↓ violations found?
YES → Planner Agent (Claude) → ElevenLabs audio explanation
    → User approves/rejects
    → if approved: Runware video generation
NO  → Runware video generation directly
    ↓
Output video stored in Supabase Storage
User can play + download
```

## Rules Graph

The rules database contains 25+ rules across 6 categories:
- **EU AI Act** (subliminal manipulation, deepfake disclosure, etc.)
- **EU Copyright** (music, trademarks, characters)
- **GDPR** (biometric data, children's data)
- **Content Safety** (CSAM, terrorism, hate speech)
- **Defamation** (false statements, impersonation)
- **International Standards** (political ads, health claims)

Rules are linked via the `rule_relationships` table forming a proper compliance graph.
