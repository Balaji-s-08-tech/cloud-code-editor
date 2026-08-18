import { Router } from "express";
import { aiController } from "../controllers/ai.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { explainCodeSchema, fixCodeSchema, generateCodeSchema } from "../schemas/ai.schema.js";

export const aiRoutes = Router();

aiRoutes.post("/explain", validateBody(explainCodeSchema), asyncHandler(aiController.explain));
aiRoutes.post("/fix", validateBody(fixCodeSchema), asyncHandler(aiController.fix));
aiRoutes.post("/generate", validateBody(generateCodeSchema), asyncHandler(aiController.generate));
