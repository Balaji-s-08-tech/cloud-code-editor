import type { RequestHandler } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";
import { AppError } from "../errors/AppError.js";

export const validateBody = (schema: ZodTypeAny): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new AppError(400, "Invalid request body.", "VALIDATION_ERROR", result.error.flatten()));
      return;
    }

    req.body = result.data;
    next();
  };
};

export const validateParams = (schema: AnyZodObject): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      next(new AppError(400, "Invalid route parameters.", "VALIDATION_ERROR", result.error.flatten()));
      return;
    }

    req.params = result.data;
    next();
  };
};
