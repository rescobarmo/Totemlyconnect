import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class MesaService {
  static async findAll() {
    return prisma.mesa.findMany({
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

  static async findById(id: number) {
    const mesa = await prisma.mesa.findUnique({
      where: { id },
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

  static async getConPedido(id: number) {
    const mesa = await prisma.mesa.findUnique({
      where: { id },
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

  static async findByPedido(pedidoId: number) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { mesa: true },
    });

    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    return pedido.mesa;
  }

  static async create(data: { numero: number }) {
    const exists = await prisma.mesa.findFirst({ where: { numero: data.numero } });
    if (exists) throw AppError.conflict(`Ya existe la mesa número ${data.numero}`);

    return prisma.mesa.create({ data });
  }

  static async update(id: number, data: { numero?: number }) {
    await this.findById(id);

    if (data.numero) {
      const exists = await prisma.mesa.findFirst({
        where: { numero: data.numero, id: { not: id } },
      });
      if (exists) throw AppError.conflict(`Ya existe la mesa número ${data.numero}`);
    }

    return prisma.mesa.update({ where: { id }, data });
  }

  static async liberar(id: number) {
    const mesa = await this.findById(id);

    if (mesa.estado === "libre") {
      throw AppError.badRequest("La mesa ya está libre");
    }

    return prisma.mesa.update({
      where: { id },
      data: { estado: "libre" },
    });
  }

  static async remove(id: number) {
    const mesa = await this.findById(id);

    if (mesa.estado !== "libre") {
      throw AppError.badRequest("No se puede eliminar una mesa ocupada");
    }

    return prisma.mesa.delete({ where: { id } });
  }
}
