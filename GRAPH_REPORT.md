# Graph Report - Big Screen Hack  (2026-05-09)

## Corpus Check
- 35 files · ~11,909 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 94 nodes · 157 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 10 edges
2. `createServiceClient()` - 9 edges
3. `Helmet.io Setup Guide` - 9 edges
4. `cn()` - 7 edges
5. `createClient()` - 6 edges
6. `runLawyerCheck()` - 5 edges
7. `runLawyerCheck()` - 4 edges
8. `runwareRequest()` - 4 edges
9. `transcribeVideo()` - 4 edges
10. `captionImage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `createServiceClient()`  [INFERRED]
  app/api/audio/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `createServiceClient()`  [INFERRED]
  app/api/generate-video/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `createServiceClient()`  [INFERRED]
  app/api/lawyer/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `createServiceClient()`  [INFERRED]
  app/api/planner/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `textToSpeech()`  [INFERRED]
  app/api/audio/route.ts → lib/elevenlabs.ts

## Communities (17 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.25
Nodes (4): DashboardClient(), cn(), formatTokens(), createClient()

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (13): Architecture, code:bash (cp .env.example .env.local), code:block2 (NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co), code:bash (cd helmet-io), code:block4 (User Input (text / text+image / video)), Helmet.io Setup Guide, Prerequisites, Rules Graph (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.27
Nodes (9): generateVideo(), handleApprove(), handleClose(), handleReject(), resetDialog(), runLawyerCheck(), runPlannerStep(), startGeneration() (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (6): handleClose(), handleReject(), resetDialog(), runLawyerCheck(), runPlannerStep(), startCheck()

### Community 5 - "Community 5"
Cohesion: 0.62
Nodes (5): captionImage(), generateVideo(), runwareRequest(), transcribeVideo(), POST()

## Knowledge Gaps
- **9 isolated node(s):** `Prerequisites`, `Step 1: Supabase Setup`, `Step 2: ElevenLabs Voice ID`, `code:bash (cp .env.example .env.local)`, `code:block2 (NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 4` to `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `createServiceClient()` connect `Community 9` to `Community 8`, `Community 4`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 0` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `createServiceClient()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`createServiceClient()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Prerequisites`, `Step 1: Supabase Setup`, `Step 2: ElevenLabs Voice ID` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._