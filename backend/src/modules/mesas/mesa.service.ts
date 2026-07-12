import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class MesaService {
  static async findAll(restaurantId: number | null | undefined) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.mesa.findMany({
      where: { ...whereRestaurant },
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

  static async findById(restaurantId: number | null | undefined, id: number) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    const mesa = await prisma.mesa.findUnique({
      where: { id, ...whereRestaurant },
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

  static async getConPedido(restaurantId: number | null | undefined, id: number) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    const mesa = await prisma.mesa.findUnique({
      where: { id, ...whereRestaurant },
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

  static async findByPedido(restaurantId: number | null | undefined, pedidoId: number) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { mesa: true },
    });

    if (!pedido) throw AppError.notFound("Pedido no encontrado");
    if (restaurantId != null && pedido.mesa.restaurantId !== restaurantId) throw AppError.notFound("Mesa no encontrada");
    return pedido.mesa;
  }

  static async create(restaurantId: number | null | undefined, data: { numero: number }) {
    const exists = await prisma.mesa.findFirst({ where: { numero: data.numero, restaurantId } });
    if (exists) throw AppError.conflict(`Ya existe la mesa número ${data.numero}`);

    return prisma.mesa.create({ data: { ...data, restaurantId } });
  }

  static async update(restaurantId: number | null | undefined, id: number, data: { numero?: number }) {
    await this.findById(restaurantId, id);

    if (data.numero) {
      const whereUnique: any = { numero: data.numero, id: { not: id } };
      if (restaurantId != null) whereUnique.restaurantId = restaurantId;
      const exists = await prisma.mesa.findFirst({
        where: whereUnique,
      });
      if (exists) throw AppError.conflict(`Ya existe la mesa número ${data.numero}`);
    }

    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.mesa.update({ where: { id, ...whereRestaurant }, data });
  }

  static async liberar(restaurantId: number | null | undefined, id: number) {
    const mesa = await this.findById(restaurantId, id);

    if (mesa.estado === "libre") {
      throw AppError.badRequest("La mesa ya está libre");
    }

    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.mesa.update({
      where: { id, ...whereRestaurant },
      data: { estado: "libre" },
    });
  }

  static async remove(restaurantId: number | null | undefined, id: number) {
    const mesa = await this.findById(restaurantId, id);

    if (mesa.estado !== "libre") {
      throw AppError.badRequest("No se puede eliminar una mesa ocupada");
    }

    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.mesa.delete({ where: { id, ...whereRestaurant } });
  }
}
