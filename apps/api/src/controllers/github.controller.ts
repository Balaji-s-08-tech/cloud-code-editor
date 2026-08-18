import type { Request, Response } from "express";
import { githubService } from "../services/github.service.js";

export const githubController = {
  async oauthUrl(req: Request, res: Response) {
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    res.json(githubService.getOAuthUrl(state));
  },

  async callback(req: Request, res: Response) {
    const connection = await githubService.exchangeCode(req.user!.id, req.body.code);
    res.json({ connection });
  },

  async pushProject(req: Request, res: Response) {
    const result = await githubService.pushProject(req.user!.id, String(req.params.projectId), req.body);
    res.json(result);
  },
};
