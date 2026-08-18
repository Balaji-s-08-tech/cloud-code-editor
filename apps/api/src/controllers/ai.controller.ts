import type { Request, Response } from "express";
import { aiService } from "../services/ai.service.js";

export const aiController = {
  async explain(req: Request, res: Response) {
    const result = await aiService.explain(req.user!.id, req.body);
    res.json(result);
  },

  async fix(req: Request, res: Response) {
    const result = await aiService.fix(req.user!.id, req.body);
    res.json(result);
  },

  async generate(req: Request, res: Response) {
    const result = await aiService.generate(req.user!.id, req.body);
    res.json(result);
  },
};
