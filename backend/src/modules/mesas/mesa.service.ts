import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class MesaService {
  static async findAll(restaurantId: number) {
    return prisma.mesa.findMany({
      where: { restaurantId },
      orderBy: { numero: "asc" },
      include: {
        pedidos: {
          where: { estado: { in: ["abierto", "entregado"] } },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            detalles: { where: { entregado: false } },
            pagosParciales: { where: { estado: "aprobado" } },
          },
        },
      },
    });
  }

  static async findById(restaurantId: number, id: number) {
    const mesa = await prisma.mesa.findUnique({
      where: { id, restaurantId },
      include: {
        pedidos: {
          where: { estado: { in: ["abierto", "entregado"] } },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            detalles: {
              include: { producto: { select: { id: true, nombre: true, imagen: true } } },
            },
            pagosParciales: true,
          },
        },
      },
    });

    if (!mesa) throw AppError.notFound("Mesa no encontrada");
    return mesa;
  }

  static async getConPedido(restaurantId: number, id: number) {
    const mesa = await prisma.mesa.findUnique({
      where: { id, restaurantId },
      include: {
        pedidos: {
          where: { estado: { in: ["abierto", "entregado"] } },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            detalles: {
              include: { producto: { select: { id: true, nombre: true, imagen: true } } },
            },
            pagosParciales: true,
          },
        },
      },
    });

    if (!mesa) throw AppError.notFound("Mesa no encontrada");

    const pedidoActivo = mesa.pedidos[0] || null;

    return {
      ...mesa,
      pedido: pedidoActivo,
    };
  }

  static async findByPedido(restaurantId: number, pedidoId: number) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { mesa: true },
    });

    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    if (pedido.mesa.restaurantId !== restaurantId) throw AppError.notFound("Mesa no encontrada");
    return pedido.mesa;
  }

  static async create(restaurantId: number, data: { numero: number }) {
    const exists = await prisma.mesa.findFirst({ where: { numero: data.numero, restaurantId } });
    if (exists) throw AppError.conflict(`Ya existe la mesa número ${data.numero}`);

    return prisma.mesa.create({ data: { ...data, restaurantId } });
  }

  static async update(restaurantId: number, id: number, data: { numero?: number }) {
    await this.findById(restaurantId, id);

    if (data.numero) {
      const exists = await prisma.mesa.findFirst({
        where: { numero: data.numero, restaurantId, id: { not: id } },
      });
      if (exists) throw AppError.conflict(`Ya existe la mesa número ${data.numero}`);
    }

    return prisma.mesa.update({ where: { id, restaurantId }, data });
  }

  static async liberar(restaurantId: number, id: number) {
    const mesa = await this.findById(restaurantId, id);

    if (mesa.estado === "libre") {
      throw AppError.badRequest("La mesa ya está libre");
    }

    return prisma.mesa.update({
      where: { id, restaurantId },
      data: { estado: "libre" },
    });
  }

  static async remove(restaurantId: number, id: number) {
    const mesa = await this.findById(restaurantId, id);

    if (mesa.estado !== "libre") {
      throw AppError.badRequest("No se puede eliminar una mesa ocupada");
    }

    return prisma.mesa.delete({ where: { id, restaurantId } });
  }
}
