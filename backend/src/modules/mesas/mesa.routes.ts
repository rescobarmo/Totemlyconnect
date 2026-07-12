import { Router, Response, NextFunction } from "express";
import { MesaService } from "./mesa.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { tenantMiddleware } from "../../common/middleware/tenant.middleware";
import { AuthRequest } from "../../common/types";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesas = await MesaService.findAll(req.restaurantId!);
    res.json({ success: true, data: mesas });
  } catch (error) { next(error); }
});

router.get("/con-pedido/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesa = await MesaService.getConPedido(Number(req.params.id), req.restaurantId!);
    res.json({ success: true, data: mesa });
  } catch (error) { next(error); }
});

router.get("/por-pedido/:pedidoId", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesa = await MesaService.findByPedido(req.restaurantId!, Number(req.params.pedidoId));
    res.json({ success: true, data: mesa });
  } catch (error) { next(error); }
});

router.get("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesa = await MesaService.findById(Number(req.params.id), req.restaurantId!);
    res.json({ success: true, data: mesa });
  } catch (error) { next(error); }
});

router.post("/", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesa = await MesaService.create(req.restaurantId!, req.body);
    res.status(201).json({ success: true, data: mesa });
  } catch (error) { next(error); }
});

router.put("/:id", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesa = await MesaService.update(req.restaurantId!, Number(req.params.id), req.body);
    res.json({ success: true, data: mesa });
  } catch (error) { next(error); }
});

router.patch("/:id/liberar", authMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mesa = await MesaService.liberar(Number(req.params.id), req.restaurantId!);
    res.json({ success: true, data: mesa });
  } catch (error) { next(error); }
});

router.delete("/:id", authMiddleware, adminMiddleware, tenantMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await MesaService.remove(Number(req.params.id), req.restaurantId!);
    res.json({ success: true, message: "Mesa eliminada" });
  } catch (error) { next(error); }
});

export default router;
