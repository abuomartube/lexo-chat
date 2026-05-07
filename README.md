# LEXO Chat

  Real chat module from EduLexo (Abu Omar) — uploaded 2026-05-07.

  ## Layout

  - `artifacts/oxford-flashcards/src/pages/Chat*.tsx` — chat pages (rooms, DMs, messages, leaderboard, notes, showcase)
  - `artifacts/oxford-flashcards/src/components/chat/` — message bubble, voice recorder/player, topic generator
  - `artifacts/oxford-flashcards/src/components/chat-ui/` — UI primitives (HeroCard, RoomCard, ChatBubble, InputBar, etc.)
  - `artifacts/oxford-flashcards/src/components/chat-lovable/` — alt design components
  - `artifacts/oxford-flashcards/src/screens/chat/` — full screens incl. showcase tiles
  - `artifacts/api-server/src/routes/chat*.ts` — server routes (rooms, messages, AI notes, AI translate/explain/feedback/analytics)
  - `artifacts/api-server/src/lib/chat-rooms-bootstrap.ts` — seed rooms on startup
  - `lib/db/src/schema/chat*.ts` — Drizzle schemas (rooms, messages, members, notes, AI feedback)

  ## Required to run

  - Postgres (Drizzle)
  - Express server hosting these routes
  - React/Vite app rendering pages
  - Env: `DATABASE_URL`, `OPENAI_API_KEY`, JWT auth (existing user system)

  This is a snapshot of files; the surrounding monorepo (auth, db wiring, server entry) is not included.
  