import { Router } from "express";
import { authenticateCLI } from "../middleware/auth.ts";
import {
  getMe,
  initChat,
  listChats,
  renameChat,
  deleteChat,
  streamMessage,
  routeAgent,
  generateAgentApp,
  modifyAgentApp,
} from "../controllers/api.controller.ts";

export const apiRouter = Router();

// All API routes require token authentication
apiRouter.use(authenticateCLI);

// Profile
apiRouter.get("/user/me", getMe);

// Chat management
apiRouter.post("/chat/init", initChat);
apiRouter.get("/chat/conversations", listChats);
apiRouter.put("/chat/:id/title", renameChat);
apiRouter.delete("/chat/:id", deleteChat);
apiRouter.post("/chat/message", streamMessage);

// Agent execution
apiRouter.post("/agent/route", routeAgent);
apiRouter.post("/agent/generate", generateAgentApp);
apiRouter.post("/agent/modify", modifyAgentApp);
