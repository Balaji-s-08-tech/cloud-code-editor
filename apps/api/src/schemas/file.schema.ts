import { z } from "zod";

export const fileParamsSchema = z.object({
  projectId: z.string().uuid(),
  fileId: z.string().uuid(),
});

export const createFileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["file", "folder"]),
  parentId: z.string().uuid().nullable().optional(),
  language: z.string().trim().max(40).nullable().optional(),
  content: z.string().max(500_000).optional(),
});

export const updateFileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    parentId: z.string().uuid().nullable().optional(),
    language: z.string().trim().max(40).nullable().optional(),
    content: z.string().max(500_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const autosaveSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string().uuid(),
        content: z.string().max(500_000),
      }),
    )
    .min(1)
    .max(25),
});
