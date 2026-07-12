import { Request } from "express";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "mesero";
  restaurantId: number | null;
  restaurantNombre?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  restaurantId?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
