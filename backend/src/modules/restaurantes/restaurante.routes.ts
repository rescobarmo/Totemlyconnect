import { Router, Response } from "express";
import { RestauranteService } from "./restaurante.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { superadminMiddleware } from "../../common/middleware/superadmin.middleware";
import { AuthRequest } from "../../common/types";

const router = Router();

router.use(authMiddleware, adminMiddleware, superadminMiddleware);

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const data = await RestauranteService.findAll();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await RestauranteService.findById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, direccion, telefono } = req.body;
    const data = await RestauranteService.create({ nombre, direccion, telefono });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, direccion, telefono, activo } = req.body;
    const data = await RestauranteService.update(Number(req.params.id), { nombre, direccion, telefono, activo });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = await RestauranteService.remove(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

export default router;
