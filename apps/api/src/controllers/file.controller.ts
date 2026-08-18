import type { Request, Response } from "express";
import { fileService } from "../services/file.service.js";

export const fileController = {
  async tree(req: Request, res: Response) {
    const tree = await fileService.listTree(req.user!.id, String(req.params.projectId));
    res.json({ tree });
  },

  async create(req: Request, res: Response) {
    const file = await fileService.createNode(req.user!.id, String(req.params.projectId), req.body);
    res.status(201).json({ file });
  },

  async update(req: Request, res: Response) {
    const file = await fileService.updateNode(
      req.user!.id,
      String(req.params.projectId),
      String(req.params.fileId),
      req.body,
    );
    res.json({ file });
  },

  async remove(req: Request, res: Response) {
    await fileService.deleteNode(req.user!.id, String(req.params.projectId), String(req.params.fileId));
    res.status(204).send();
  },

  async autosave(req: Request, res: Response) {
    const result = await fileService.autosave(req.user!.id, String(req.params.projectId), req.body);
    res.json(result);
  },
};
