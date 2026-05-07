// ============================================================================
// English Study Planner routes — Phase E3.
//
// Single endpoint:
//   GET /english/me/today-plan
//
// Auth: requireAuth. The plan is computed dynamically (no DB writes) from
// the caller's English enrollment + Phase E1/E2 progress tables. Returns a
// 200 even for unenrolled users (with empty buckets and a `notes` hint), so
// the front-end can render a single screen for both states.
// ============================================================================

import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getTodayPlan } from "../lib/english-planner-service";

const router: IRouter = Router();

router.get("/english/me/today-plan", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const plan = await getTodayPlan(userId);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

export default router;
