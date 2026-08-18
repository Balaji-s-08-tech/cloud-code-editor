import { z } from "zod";

export const projectIdParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
});
