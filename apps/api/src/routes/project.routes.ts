import { Router } from "express";
import { fileController } from "../controllers/file.controller.js";
import { githubController } from "../controllers/github.controller.js";
import { projectController } from "../controllers/project.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { autosaveSchema, createFileSchema, fileParamsSchema, updateFileSchema } from "../schemas/file.schema.js";
import { githubPushSchema } from "../schemas/github.schema.js";
import { createProjectSchema, projectIdParamsSchema } from "../schemas/project.schema.js";

export const projectRoutes = Router();

projectRoutes
  .route("/")
  .get(asyncHandler(projectController.list))
  .post(validateBody(createProjectSchema), asyncHandler(projectController.create));

projectRoutes
  .route("/:projectId")
  .get(validateParams(projectIdParamsSchema), asyncHandler(projectController.get))
  .delete(validateParams(projectIdParamsSchema), asyncHandler(projectController.remove));

projectRoutes.get(
  "/:projectId/files/tree",
  validateParams(projectIdParamsSchema),
  asyncHandler(fileController.tree),
);

projectRoutes.post(
  "/:projectId/files",
  validateParams(projectIdParamsSchema),
  validateBody(createFileSchema),
  asyncHandler(fileController.create),
);

projectRoutes.post(
  "/:projectId/files/autosave",
  validateParams(projectIdParamsSchema),
  validateBody(autosaveSchema),
  asyncHandler(fileController.autosave),
);

projectRoutes.patch(
  "/:projectId/files/:fileId",
  validateParams(fileParamsSchema),
  validateBody(updateFileSchema),
  asyncHandler(fileController.update),
);

projectRoutes.delete(
  "/:projectId/files/:fileId",
  validateParams(fileParamsSchema),
  asyncHandler(fileController.remove),
);

projectRoutes.post(
  "/:projectId/github/push",
  validateParams(projectIdParamsSchema),
  validateBody(githubPushSchema),
  asyncHandler(githubController.pushProject),
);
