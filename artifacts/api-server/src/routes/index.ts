import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import chatRouter from "./chat";
import chatAiRouter from "./chat-ai";
import chatAiTranslateRouter from "./chat-ai-translate";
import chatAiExplainRouter from "./chat-ai-explain";
import chatAiNotesRouter from "./chat-ai-notes";
import chatAiAnalyticsRouter from "./chat-ai-analytics";
import chatAiFeedbackRouter from "./chat-ai-feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(chatRouter);
router.use(chatAiRouter);
router.use(chatAiTranslateRouter);
router.use(chatAiExplainRouter);
router.use(chatAiNotesRouter);
router.use(chatAiAnalyticsRouter);
router.use(chatAiFeedbackRouter);

export default router;
