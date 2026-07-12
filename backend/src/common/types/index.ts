import { Request } from "express";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "mesero";
}

export interface AuthRequest extends Request {
  user?: AuthUser;
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
