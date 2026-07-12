import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import categoriaRoutes from "../modules/categorias/categoria.routes";
import productoRoutes from "../modules/productos/producto.routes";
import mesaRoutes from "../modules/mesas/mesa.routes";
import pedidoRoutes from "../modules/pedidos/pedido.routes";
import pagoRoutes from "../modules/pagos/pago.routes";
import restauranteRoutes from "../modules/restaurantes/restaurante.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categorias", categoriaRoutes);
router.use("/productos", productoRoutes);
router.use("/mesas", mesaRoutes);
router.use("/pedidos", pedidoRoutes);
router.use("/pagos", pagoRoutes);
router.use("/restaurantes", restauranteRoutes);

// Health check
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
