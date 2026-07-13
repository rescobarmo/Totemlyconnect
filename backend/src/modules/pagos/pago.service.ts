import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";
import { events } from "../../gateway/socket.gateway";

export class PagoService {
  static async getByPedido(restaurantId: number | null | undefined, pedidoId: number) {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    if (restaurantId != null && pedido.restaurantId !== restaurantId) throw AppError.notFound("Pedido no encontrado en este restaurante");

    return prisma.pagoParcial.findMany({
      where: { pedidoId },
      orderBy: { id: "asc" },
    });
  }

  static async dividirEquitativo(
      restaurantId: number | null | undefined,
      pedidoId: number,
      personas: number,
      metodo: string,
      propinaPct: number
    ) {
      const whereRestaurant = restaurantId != null ? { restaurantId } : {};
      const pedido = await prisma.pedido.findFirst({
        where: {
          id: pedidoId,
          ...whereRestaurant,
          estado: { in: ["abierto", "entregado"] },
        },
      });
  
      if (!pedido) throw AppError.notFound("Pedido no encontrado o ya cerrado");

      // Cancelar pagos pendientes anteriores
      await prisma.pagoParcial.updateMany({
        where: { pedidoId, estado: "pendiente" },
        data: { estado: "rechazado", mensajeRespuesta: "Reemplazado por nueva división" },
      });

    const subtotal = Number(pedido.total);
    const propina = Math.round(subtotal * propinaPct) / 100;
    const totalConPropina = subtotal + propina;
    const montoPorPersona = Math.round((totalConPropina / personas) * 100) / 100;
    const ajuste = Math.round((totalConPropina - montoPorPersona * personas) * 100) / 100;

    const pagosCreados = [];

    for (let i = 1; i <= personas; i++) {
      const monto = i === personas ? montoPorPersona + ajuste : montoPorPersona;

      const pago = await prisma.pagoParcial.create({
        data: {
          pedidoId,
          monto,
          metodo: metodo as any,
          tipoDivision: "equitativa",
          estado: "pendiente",
        },
      });

      pagosCreados.push({ id: pago.id, monto: Number(pago.monto) });
    }

    return {
      pagos: pagosCreados,
      total: totalConPropina,
      subtotal,
      propina,
    };
  }

  static async dividirPorItems(
    restaurantId: number | null | undefined,
    pedidoId: number,
    grupos: Array<{ items_ids: number[]; monto: number; metodo: string }>
  ) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        ...whereRestaurant,
        estado: { in: ["abierto", "entregado"] },
      },
    });

    if (!pedido) throw AppError.notFound("Pedido no encontrado");

    const pagosCreados = [];

    for (const grupo of grupos) {
      if (!grupo.items_ids?.length || grupo.monto <= 0) continue;

      const pago = await prisma.pagoParcial.create({
        data: {
          pedidoId,
          monto: grupo.monto,
          metodo: (grupo.metodo || "tarjeta") as any,
          tipoDivision: "por_items",
          itemsIds: grupo.items_ids,
          estado: "pendiente",
        },
      });

      pagosCreados.push({ id: pago.id, monto: Number(pago.monto) });
    }

    return { pagos: pagosCreados };
  }

  static async procesarPago(restaurantId: number | null | undefined, pagoId: number, metodo?: string) {
    const pago = await prisma.pagoParcial.findUnique({ where: { id: pagoId }, include: { pedido: true } });
    if (!pago) throw AppError.notFound("Pago no encontrado");
    if (pago.estado !== "pendiente") throw AppError.badRequest("Este pago ya fue procesado");
    if (restaurantId != null && pago.pedido.restaurantId !== restaurantId) throw AppError.notFound("Pago no encontrado en este restaurante");

    // Actualizar método si se proporciona uno distinto
    if (metodo && metodo !== pago.metodo) {
      await prisma.pagoParcial.update({
        where: { id: pagoId },
        data: { metodo: metodo as any },
      });
    }

    // Simulación de terminal POS: 95% aprobación
    const transaccionId = `POS-${crypto.randomUUID().replace(/-/g, "").substring(0, 16).toUpperCase()}`;
    const aprobado = Math.random() * 100 <= 95;

    if (aprobado) {
      await prisma.pagoParcial.update({
        where: { id: pagoId },
        data: {
          estado: "aprobado",
          transaccionId,
          mensajeRespuesta: "Transacción aprobada",
        },
      });

      const [totalPagado, totalPagos] = await Promise.all([
        this._totalAprobado(pago.pedidoId),
        this._totalPagos(pago.pedidoId),
      ]);

      const pedido = await prisma.pedido.findUnique({ where: { id: pago.pedidoId } });

      if (pedido) {
        events.pagoProcesado(pedido.mesaId, {
          pagoId,
          aprobado: true,
          transaccionId,
          total_pagado: totalPagado,
          total_pedido: totalPagos,
        });
      }

      return {
        aprobado: true,
        transaccionId,
        mensaje: "Transacción aprobada",
        total_pagado: totalPagado,
        total_pedido: totalPagos,
      };
    } else {
      await prisma.pagoParcial.update({
        where: { id: pagoId },
        data: {
          estado: "rechazado",
          mensajeRespuesta: "Fondos insuficientes",
        },
      });

      const pedido = await prisma.pedido.findUnique({ where: { id: pago.pedidoId } });

      if (pedido) {
        events.pagoProcesado(pedido.mesaId, {
          pagoId,
          aprobado: false,
          mensaje: "Fondos insuficientes en la tarjeta",
        });
      }

      return {
        aprobado: false,
        mensaje: "Fondos insuficientes en la tarjeta",
      };
    }
  }

  static async cerrarCuenta(restaurantId: number | null | undefined, pedidoId: number, userId?: number) {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    if (restaurantId != null && pedido.restaurantId !== restaurantId) throw AppError.notFound("Pedido no encontrado en este restaurante");
    if (pedido.estado === "cerrado") throw AppError.badRequest("La cuenta ya está cerrada");

    const [totalPagado, totalPagos] = await Promise.all([
      this._totalAprobado(pedidoId),
      this._totalPagos(pedidoId),
    ]);

    if (totalPagado < totalPagos) {
      throw AppError.badRequest(
        `La cuenta no está saldada. Pagado: ${totalPagado}, Total: ${totalPagos}, Falta: ${Math.round((totalPagos - totalPagado) * 100) / 100}`
      );
    }

    const usuario = userId ?? pedido.userId;

    await prisma.$transaction([
      prisma.pedido.update({
        where: { id: pedidoId },
        data: { estado: "cerrado" },
      }),
      prisma.mesa.update({
        where: { id: pedido.mesaId },
        data: { estado: "libre" },
      }),
      prisma.historialPedido.create({
        data: {
          pedidoId,
          userId: usuario,
          estadoAnterior: pedido.estado,
          estadoNuevo: "cerrado",
          observacion: "Cuenta cerrada",
        },
      }),
      prisma.historialMesa.create({
        data: {
          mesaId: pedido.mesaId,
          userId: usuario,
          estadoAnterior: "ocupada",
          estadoNuevo: "cuenta_cerrada",
          pedidoId,
          observacion: "Cuenta cerrada",
        },
      }),
    ]);

    events.pedidoCerrado(pedido.mesaId, {
      pedidoId,
      mesaId: pedido.mesaId,
      estado: "cerrado",
    });

    return {
      success: true,
      total_pagado: totalPagado,
      total_pedido: totalPagos,
    };
  }

  static async webhookCallback(data: {
    pago_id: number;
    aprobado: boolean;
    transaccion_id?: string;
    mensaje?: string;
  }) {
    const pago = await prisma.pagoParcial.findUnique({ where: { id: data.pago_id } });
    if (!pago) throw AppError.notFound("Pago no encontrado");

    const estado = data.aprobado ? "aprobado" : "rechazado";

    await prisma.pagoParcial.update({
      where: { id: data.pago_id },
      data: {
        estado: estado as any,
        transaccionId: data.transaccion_id || null,
        mensajeRespuesta: data.mensaje || null,
      },
    });

    return { recibido: true };
  }

  private static async _totalAprobado(pedidoId: number): Promise<number> {
    const result = await prisma.pagoParcial.aggregate({
      where: { pedidoId, estado: "aprobado" },
      _sum: { monto: true },
    });
    return Number(result._sum.monto || 0);
  }

  private static async _totalPagos(pedidoId: number): Promise<number> {
    const result = await prisma.pagoParcial.aggregate({
      where: { pedidoId, estado: { in: ["pendiente", "aprobado"] } },
      _sum: { monto: true },
    });
    return Number(result._sum.monto || 0);
  }
}
