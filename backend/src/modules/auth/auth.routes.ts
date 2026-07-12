import { Router, Response } from "express";
import { AuthService } from "./auth.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { AuthRequest } from "../../common/types";

const router = Router();

router.post("/login", async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/register", async (req, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const user = await AuthService.register(name, email, password);
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.me(req.user!.id);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Admin: listar usuarios
router.get("/usuarios", authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await AuthService.listar();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

// Admin: crear usuario (mesero)
router.post("/usuarios", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const user = await AuthService.crear(name, email, password);
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

export default router;
