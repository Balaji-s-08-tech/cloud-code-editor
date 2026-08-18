import { z } from "zod";

const codeContextSchema = {
  code: z.string().min(1).max(50_000),
  language: z.string().trim().max(40).optional(),
  fileName: z.string().trim().max(120).optional(),
};

export const explainCodeSchema = z.object(codeContextSchema);

export const fixCodeSchema = z.object(codeContextSchema);

export const generateCodeSchema = z.object({
  prompt: z.string().trim().min(1).max(5_000),
  context: z.string().max(50_000).optional(),
  language: z.string().trim().max(40).optional(),
  fileName: z.string().trim().max(120).optional(),
});
