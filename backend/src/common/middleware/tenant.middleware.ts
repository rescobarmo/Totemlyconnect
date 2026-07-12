import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";

export function tenantMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  // Admin global (sin restaurantId) puede usar header x-restaurant-id
  const headerRid = req.headers["x-restaurant-id"];
  const userRid = req.user?.restaurantId;

  if (userRid) {
    req.restaurantId = userRid;
  } else if (headerRid) {
    req.restaurantId = Number(headerRid);
  }

  next();
}
