import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "../uploads",
  PRINTER_IP: process.env.PRINTER_IP || "192.168.1.100",
  PRINTER_PORT: parseInt(process.env.PRINTER_PORT || "9100", 10),
};
