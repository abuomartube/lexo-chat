# LEXO Chat — Clean Standalone Build

  A clean, runnable snapshot of the LEXO chat module — same rooms, same design, same quality, no extra modules.
  Uploaded 2026-05-07.

  ## What's inside

  A pnpm monorepo containing **only** what's needed for the chat to run:

  - **artifacts/api-server** — Express API: `/api/auth`, `/api/chat`, `/api/chat-ai`, `/api/chat-ai-translate`, `/api/chat-ai-explain`, `/api/chat-ai-notes`, `/api/chat-ai-feedback`, `/api/chat-ai-analytics`, `/api/storage`, `/api/health`
  - **artifacts/oxford-flashcards** — React + Vite frontend with **only** these routes:
    - `/login`, `/signup` — authentication
    - `/chat` — list of chat rooms (text + voice)
    - `/chat/:roomId` — room view
    - `/chat/dm/:threadId` — direct messages
    - `/chat/leaderboard`, `/chat/messages`, `/chat/notes`, `/chat/showcase`
  - **lib/db** — Drizzle schemas (users, sessions, chat rooms, messages, AI notes, etc.)
  - **lib/api-zod, api-client-react, api-spec** — typed API contract
  - **lib/integrations-openai-ai-server** — OpenAI proxy for AI features

  What was REMOVED (vs. the original EduLexo monorepo):
  - IELTS module
  - English curriculum / Lexo packages
  - Oxford 3000 flashcards UI
  - Course catalog / cart / payments / checkout
  - Admin dashboard
  - Live sessions / certificates / email templates
  - All landing pages

  ## Quick start

  ```bash
  pnpm install
  cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, PORT, BASE_PATH
  pnpm --filter @workspace/db drizzle:push    # create tables
  pnpm --filter @workspace/api-server dev     # terminal 1 — server
  pnpm --filter @workspace/oxford-flashcards dev   # terminal 2 — web
  ```

  ## Required environment variables

  | Variable | Purpose |
  |---|---|
  | `DATABASE_URL` | Postgres connection string |
  | `JWT_SECRET` | Random secret for sessions |
  | `OPENAI_API_KEY` | AI features (translate / explain / notes / feedback) |
  | `PORT` | Port the server / vite dev server binds to |
  | `BASE_PATH` | Vite base path, e.g. `/` |
  | `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY` | (optional) Google Cloud Storage for voice message uploads |

  ## How to use on Replit

  1. Create a new Replit, "Import from GitHub" → `https://github.com/abuomartube/lexo-chat`
  2. Add the secrets above (`DATABASE_URL` is auto-provided if you add Replit Database)
  3. Run `pnpm install` then push the DB schema
  4. Add two workflows:
     - **API Server** → `pnpm --filter @workspace/api-server dev` (PORT=8080)
     - **Web** → `pnpm --filter @workspace/oxford-flashcards dev` (PORT=5173, BASE_PATH=/)
  5. Configure proxy: `/api/*` → API Server, everything else → Web
  6. Open the preview, sign up, and you're chatting.

  ## Notes

  - After signup, the **first user is normal**. To make someone admin, manually `UPDATE users SET role='admin' WHERE email='you@example.com';`
  - Voice messages need GCS credentials; without them, voice upload will 500. Text + AI features work with just `OPENAI_API_KEY`.
  - The AI rate limit is 10 requests/day for free users, 100/day for users with an active enrollment record.
  