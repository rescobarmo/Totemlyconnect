import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";
import { events } from "../../gateway/socket.gateway";
import { PrintService } from "../print/print.service";

export class PedidoService {
  static async findById(id: number) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        mesa: { select: { id: true, numero: true } },
        user: { select: { id: true, name: true } },
        detalles: {
          include: { producto: { select: { id: true, nombre: true, imagen: true, precio: true } } },
          orderBy: { id: 'asc' }
        },
        pagosParciales: true,
      },
    });
    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    return pedido;
  }

  static async iniciar(mesaId: number, userId: number) {
    const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
    if (!mesa) throw AppError.notFound("Mesa no encontrada");

    const existente = await prisma.pedido.findFirst({
      where: {
        mesaId,
        estado: { in: ["abierto", "entregado"] },
      },
      orderBy: { id: "desc" },
      include: {
        detalles: {
          include: { producto: { select: { id: true, nombre: true, imagen: true } } },
        },
        pagosParciales: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (existente) return existente;

    const pedido = await prisma.pedido.create({
      data: { mesaId, userId },
      include: {
        detalles: true,
        user: { select: { id: true, name: true } },
      },
    });

    events.pedidoCreado(mesaId, {
      pedidoId: pedido.id,
      mesaId,
      numero: mesa.numero,
      userId,
      userName: pedido.user.name,
    });

    return pedido;
  }

  static async agregarItem(pedidoId: number, productoId: number, cantidad: number) {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    if (pedido.estado === "cerrado") throw AppError.badRequest("El pedido ya está cerrado");

    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw AppError.notFound("Producto no encontrado");

    // Verificar si es el primer item (para imprimir en cocina)
    const countAnterior = await prisma.detallePedido.count({ where: { pedidoId } });

    const precio = Number(producto.precio);
    const subtotal = Math.round(cantidad * precio * 100) / 100;

    const detalle = await prisma.detallePedido.create({
      data: {
        pedidoId,
        productoId,
        cantidad,
        precioUnitario: precio,
        subtotal,
      },
    });

    const total = await this._recalcularTotal(pedidoId);

    const items = await prisma.detallePedido.findMany({
      where: { pedidoId },
      include: { producto: { select: { id: true, nombre: true, imagen: true } } },
      orderBy: { id: "asc" },
    });

    events.pedidoItemAgregado(pedido.mesaId, {
      pedidoId,
      detalle,
      items,
      total,
    });

    // Imprimir en cocina al agregar el primer item
    if (countAnterior === 0) {
      const mesa = await prisma.mesa.findUnique({ where: { id: pedido.mesaId } });
      const user = await prisma.user.findUnique({ where: { id: pedido.userId }, select: { name: true } });

      PrintService.imprimirPedido({
        id: pedido.id,
        mesaNumero: mesa?.numero ?? 0,
        userName: user?.name ?? "",
        createdAt: pedido.createdAt,
        detalles: items.map((it) => ({
          cantidad: it.cantidad,
          producto: { nombre: it.producto?.nombre ?? "" },
        })),
      }).catch((err: any) => console.error("[Print] Error:", err.message));
    }

    return { detalle, items, total };
  }

  static async eliminarItem(detalleId: number) {
    const detalle = await prisma.detallePedido.findUnique({ where: { id: detalleId } });
    if (!detalle) throw AppError.notFound("Item no encontrado");
    if (detalle.entregado) throw AppError.badRequest("No se puede eliminar un item ya entregado");

    const pedidoId = detalle.pedidoId;

    await prisma.detallePedido.delete({ where: { id: detalleId } });

    const total = await this._recalcularTotal(pedidoId);

    const items = await prisma.detallePedido.findMany({
      where: { pedidoId },
      include: { producto: { select: { id: true, nombre: true, imagen: true } } },
      orderBy: { id: "asc" },
    });

    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });

    if (pedido) {
      events.pedidoItemAgregado(pedido.mesaId, {
        pedidoId,
        action: "item_eliminado",
        items,
        total,
      });
    }

    return { items, total };
  }

  static async entregar(pedidoId: number) {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    if (pedido.estado === "cerrado") throw AppError.badRequest("El pedido ya está cerrado");

    await prisma.detallePedido.updateMany({
      where: { pedidoId, entregado: false },
      data: { entregado: true },
    });

    const updated = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: "entregado" },
    });

    events.pedidoEntregado(pedido.mesaId, {
      pedidoId,
      estado: "entregado",
    });

    return updated;
  }

  static async listarVentas(filters: {
    userId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const where: any = { estado: "cerrado" };

    if (filters.userId) where.userId = filters.userId;

    if (filters.fechaDesde || filters.fechaHasta) {
      where.createdAt = {};
      if (filters.fechaDesde) where.createdAt.gte = new Date(filters.fechaDesde);
      if (filters.fechaHasta) {
        const hasta = new Date(filters.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.createdAt.lte = hasta;
      }
    }

    const [ventas, meseros] = await Promise.all([
      prisma.pedido.findMany({
        where,
        include: {
          mesa: { select: { id: true, numero: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "mesero" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    return {
      ventas,
      meseros,
      total_ventas: totalVentas,
      cantidad: ventas.length,
    };
  }

  private static async _recalcularTotal(pedidoId: number): Promise<number> {
    const result = await prisma.detallePedido.aggregate({
      where: { pedidoId },
      _sum: { subtotal: true },
    });

    const total = Number(result._sum.subtotal || 0);

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { total },
    });

    return total;
  }
}
