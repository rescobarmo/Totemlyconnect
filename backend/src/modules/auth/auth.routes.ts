import { Router, Response } from "express";
import { AuthService } from "./auth.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { superadminMiddleware } from "../../common/middleware/superadmin.middleware";
import { tenantMiddleware } from "../../common/middleware/tenant.middleware";
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

router.post("/register", superadminMiddleware, async (req, res: Response) => {
  try {
    const { name, email, password, restaurantId } = req.body;
    const user = await AuthService.register(name, email, password, restaurantId);
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

// Admin: listar usuarios (filtrado por restaurante)
router.get("/usuarios", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId ? Number(req.query.restaurantId) : req.restaurantId;
    const users = await AuthService.listar(restaurantId);
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

// Admin: crear usuario (mesero) dentro del restaurante
router.post("/usuarios", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, restaurantId: bodyRestId } = req.body;
    const restaurantId = bodyRestId || req.restaurantId;
    const user = await AuthService.crear(name, email, password, restaurantId, role);
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

// Superadmin: eliminar usuario
router.delete("/usuarios/:id", authMiddleware, adminMiddleware, superadminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await AuthService.eliminar(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

// Superadmin: cambiar rol de usuario
router.patch("/usuarios/:id/role", authMiddleware, adminMiddleware, superadminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const result = await AuthService.updateRole(Number(req.params.id), role);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

export default router;
