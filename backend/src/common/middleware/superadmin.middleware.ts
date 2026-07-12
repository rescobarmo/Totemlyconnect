import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";

export function superadminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "superadmin") {
    res.status(403).json({ success: false, error: "Se requieren permisos de superadministrador" });
    return;
  }
  next();
}
