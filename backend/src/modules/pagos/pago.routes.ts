import { Router, Response, NextFunction } from "express";
import { PagoService } from "./pago.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { AuthRequest } from "../../common/types";

const router = Router();

router.get("/:pedidoId", authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const pagos = await PagoService.getByPedido(Number(req.params.pedidoId));
    res.json({ success: true, data: pagos });
  } catch (error) { next(error); }
});

router.post("/dividir-equitativo", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pedido_id, personas = 1, metodo = "tarjeta", propina_pct = 0 } = req.body;
    const result = await PagoService.dividirEquitativo(
      Number(pedido_id),
      Math.max(1, Number(personas)),
      metodo,
      Number(propina_pct)
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.post("/dividir-por-items", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pedido_id, grupos } = req.body;
    const result = await PagoService.dividirPorItems(Number(pedido_id), grupos);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.post("/procesar", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pago_id, metodo } = req.body;
    const result = await PagoService.procesarPago(Number(pago_id), metodo);
    const statusCode = result.aprobado ? 200 : 402;
    res.status(statusCode).json({ success: result.aprobado, data: result });
  } catch (error) { next(error); }
});

router.post("/cerrar-cuenta", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pedido_id } = req.body;
    const result = await PagoService.cerrarCuenta(Number(pedido_id), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.post("/webhook", async (req, res: Response, next: NextFunction) => {
  try {
    const result = await PagoService.webhookCallback(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

export default router;
