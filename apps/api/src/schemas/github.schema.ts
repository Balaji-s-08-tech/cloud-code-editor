import { z } from "zod";

export const githubCallbackSchema = z.object({
  code: z.string().min(1),
});

export const githubPushSchema = z.object({
  repoOwner: z.string().trim().min(1),
  repoName: z.string().trim().min(1),
  branch: z.string().trim().min(1).default("main"),
  commitMessage: z.string().trim().min(1).max(200).default("Sync project from Cloud Code Editor"),
});
