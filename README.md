# LEXO Chat — Standalone Runnable Snapshot

  Snapshot of the chat module from EduLexo (Abu Omar) packaged so it can run on its own.
  Uploaded 2026-05-07.

  ## What's included

  - **Root**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`
  - **artifacts/api-server**: Express API server with all routes (auth, chat, chat-AI, courses, support, etc.)
  - **artifacts/oxford-flashcards**: React + Vite frontend with all pages, chat UI, dashboard, auth
  - **lib/db**: Drizzle schemas (users, chat rooms/messages, AI notes, etc.)
  - **lib/api-spec, api-client-react, api-zod**: OpenAPI contract + generated React Query hooks + Zod schemas
  - **lib/integrations-openai-ai-server**: OpenAI proxy integration for AI features
  - **lib/flashcards-ui**: shared flashcard UI components

  ## Quick start

  ```bash
  pnpm install
  cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
  pnpm --filter @workspace/db drizzle:push
  pnpm --filter @workspace/api-server dev   # in one terminal
  pnpm --filter @workspace/oxford-flashcards dev   # in another
  ```

  ## Required env vars

  - `DATABASE_URL` — Postgres connection string
  - `JWT_SECRET` — random secret for session tokens
  - `OPENAI_API_KEY` — for AI translate / explain / notes / feedback features
  - (optional) `RESEND_API_KEY`, `GCS_*`, `VIMEO_ACCESS_TOKEN` — needed for email, object storage, video features used by other modules

  ## Notes

  - This is a copy of the full monorepo subset, not a slimmed rewrite. All chat code paths and their dependencies are intact.
  - Routes used by chat: `/api/chat/*`, `/api/auth/*`, `/api/chat-ai/*`, `/api/chat-ai-notes/*`, `/api/chat-ai-translate/*`, `/api/chat-ai-explain/*`, `/api/chat-ai-feedback/*`
  - Chat pages on the frontend: `/chat`, `/chat/room/:id`, `/chat/dm/:id`, `/chat/notes`, `/chat/leaderboard`, `/chat/messages`
  - Other learning modules (IELTS, English curriculum, flashcards) are NOT included in this snapshot — only the chat-relevant slice.
  