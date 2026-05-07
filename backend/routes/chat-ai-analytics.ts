import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getAiAnalytics } from "../lib/ai-analytics";

const router: IRouter = Router();

router.get("/chat/ai-analytics", requireAuth, (_req, res) => {
  res.json(getAiAnalytics());
});

export default router;
