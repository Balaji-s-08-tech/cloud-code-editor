import type { RequestHandler } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../errors/AppError.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      throw new AppError(401, "Missing bearer token.", "AUTH_TOKEN_MISSING");
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, "Invalid or expired token.", "AUTH_TOKEN_INVALID");
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
};
