// Strategic Simplification (May 2026)
//
// EduLexo Core is being kept lightweight. Heavy curriculum systems
// (lessons / books / quizzes / exercises / adaptive study plans /
// intervention engine / live sessions) are temporarily HIDDEN from
// the active student experience. The underlying data, server routes,
// page components, and DB tables are intentionally PRESERVED — flip
// the flag back to `true` to restore the full experience.
//
// What stays active when CURRICULUM_ENABLED = false:
//   - Auth, billing/packages/checkout, profile, account settings
//   - Oxford 3000 / Lexo 5000 flashcards (`/app`, `/demo`)
//   - Community chat (`/chat/*`) and the IELTS in-app AI chat (`LexoAiChat`)
//   - English package marketing (`/english`, `/course/english/:tier`)
//   - IELTS module (`/ielts`, `/course/ielts/:tier`)
//   - Dashboard shell (`/dashboard`)
//
// What gets hidden / unmounted / redirected when CURRICULUM_ENABLED = false:
//   - LexoHub curriculum widgets (Books Roadmap, Today's Tasks, Continue
//     Learning hero) — replaced with a simplified hub
//   - `/dashboard/english/study` (adaptive plan + study session)
//   - `/dashboard/english/:tool` and `/dashboard/lexo[/:tool]` (curriculum
//     tool iframes)
//   - `/live-sessions`
//   - In `artifacts/english`: all curriculum/tool routes show a "coming
//     back soon" placeholder; `/mentor/flashcards` and `/package/*` stay live
export const CURRICULUM_ENABLED = false;
