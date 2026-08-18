import { Router } from "express";
import { githubController } from "../controllers/github.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { githubCallbackSchema } from "../schemas/github.schema.js";

export const githubRoutes = Router();

githubRoutes.get("/oauth-url", asyncHandler(githubController.oauthUrl));
githubRoutes.post("/callback", validateBody(githubCallbackSchema), asyncHandler(githubController.callback));
