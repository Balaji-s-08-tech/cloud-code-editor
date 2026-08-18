import type { Request, Response } from "express";
import { projectService } from "../services/project.service.js";

export const projectController = {
  async create(req: Request, res: Response) {
    const project = await projectService.createProject(req.user!.id, req.body);
    res.status(201).json({ project });
  },

  async list(req: Request, res: Response) {
    const projects = await projectService.listProjects(req.user!.id);
    res.json({ projects });
  },

  async get(req: Request, res: Response) {
    const project = await projectService.getProject(req.user!.id, String(req.params.projectId));
    res.json({ project });
  },

  async remove(req: Request, res: Response) {
    await projectService.deleteProject(req.user!.id, String(req.params.projectId));
    res.status(204).send();
  },
};
