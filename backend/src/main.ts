import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { env } from "./config/env";
import prisma from "./config/database";
import { initSocket } from "./gateway/socket.gateway";
import routes from "./routes";
import { errorMiddleware } from "./common/middleware/error.middleware";

async function main() {
  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files - uploads
  app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));

  // En producción, servir el frontend compilado
  if (env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "../../frontend/dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
    });
  }

  // Socket.io
  initSocket(server);
  console.log("[Socket] Initialized");

  // Routes
  app.use("/api", routes);

  // Error handler
  app.use(errorMiddleware);

  // Start server
  server.listen(env.PORT, () => {
    console.log(`\n🚀 TotemConnect Backend running on port ${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   API: http://localhost:${env.PORT}/api`);
    console.log(`   Health: http://localhost:${env.PORT}/api/health\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[Server] Shutting down...");
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
