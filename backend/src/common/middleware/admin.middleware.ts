import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { AppError } from "../errors/AppError";

export function adminMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    return next(AppError.forbidden("Se requieren permisos de administrador"));
  }
  next();
}
