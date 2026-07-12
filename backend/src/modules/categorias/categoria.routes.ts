import { Router, Response, NextFunction } from "express";
import { CategoriaService } from "./categoria.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { tenantMiddleware } from "../../common/middleware/tenant.middleware";
import { AuthRequest } from "../../common/types";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categorias = await CategoriaService.findAll(req.restaurantId, true);
    res.json({ success: true, data: categorias });
  } catch (error) { next(error); }
});

router.get("/activas", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categorias = await CategoriaService.findAll(req.restaurantId, false);
    res.json({ success: true, data: categorias });
  } catch (error) { next(error); }
});

router.get("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await CategoriaService.findById(Number(req.params.id), req.restaurantId);
    res.json({ success: true, data: cat });
  } catch (error) { next(error); }
});

router.post("/", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await CategoriaService.create(req.restaurantId, req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (error) { next(error); }
});

router.put("/:id", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await CategoriaService.update(Number(req.params.id), req.body, req.restaurantId);
    res.json({ success: true, data: cat });
  } catch (error) { next(error); }
});

router.patch("/:id/toggle", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await CategoriaService.toggleActivo(Number(req.params.id), req.restaurantId);
    res.json({ success: true, data: cat });
  } catch (error) { next(error); }
});

router.delete("/:id", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await CategoriaService.remove(Number(req.params.id), req.restaurantId);
    res.json({ success: true, message: "Categoría eliminada" });
  } catch (error) { next(error); }
});

export default router;
