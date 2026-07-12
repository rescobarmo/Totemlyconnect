import { Router, Response, NextFunction } from "express";
import { PedidoService } from "./pedido.service";
import { PrintService } from "../print/print.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { AuthRequest } from "../../common/types";
import prisma from "../../config/database";

const router = Router();

router.post("/iniciar", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mesa_id } = req.body;
    const pedido = await PedidoService.iniciar(Number(mesa_id), req.user!.id, req.user!.restaurantId!);
    res.status(201).json({ success: true, data: pedido });
  } catch (error) { next(error); }
});

router.post("/agregar-item", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pedido_id, producto_id, cantidad = 1 } = req.body;
    const result = await PedidoService.agregarItem(
      Number(pedido_id),
      Number(producto_id),
      Math.max(1, Number(cantidad)),
      req.user!.restaurantId!
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.delete("/eliminar-item/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await PedidoService.eliminarItem(Number(req.params.id), req.user!.restaurantId!);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.post("/entregar", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pedido_id } = req.body;
    const pedido = await PedidoService.entregar(Number(pedido_id), req.user!.restaurantId!);
    res.json({ success: true, data: pedido });
  } catch (error) { next(error); }
});

router.get("/ventas", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user_id, fecha_desde, fecha_hasta } = req.query;
    const result = await PedidoService.listarVentas(req.user!.restaurantId!, {
      userId: user_id ? Number(user_id) : undefined,
      fechaDesde: fecha_desde as string | undefined,
      fechaHasta: fecha_hasta as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.post("/reimprimir/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pedidoId = Number(req.params.id);
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        mesa: { select: { numero: true } },
        user: { select: { name: true } },
        detalles: {
          include: { producto: { select: { nombre: true } } },
        },
      },
    });
    if (!pedido) return res.status(404).json({ success: false, error: "Pedido no encontrado" });

    const printed = await PrintService.imprimirPedido({
      id: pedido.id,
      mesaNumero: pedido.mesa?.numero ?? 0,
      userName: pedido.user?.name ?? "",
      createdAt: pedido.createdAt,
      detalles: pedido.detalles.map((d) => ({
        cantidad: d.cantidad,
        producto: { nombre: d.producto?.nombre ?? "" },
      })),
    });

    res.json({ success: true, data: { printed } });
  } catch (error) { next(error); }
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pedido = await PedidoService.findById(Number(req.params.id), req.user!.restaurantId!);
    res.json({ success: true, data: pedido });
  } catch (error) { next(error); }
});

export default router;
