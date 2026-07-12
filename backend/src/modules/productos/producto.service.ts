import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class ProductoService {
  static async findAll(restaurantId?: number | null, includeInactive = false) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.producto.findMany({
      where: { ...whereRestaurant, ...(includeInactive ? {} : { activo: true }) },
      include: {
        categoria: { select: { id: true, nombre: true, icono: true } },
      },
      orderBy: [
        { categoria: { nombre: "asc" } },
        { nombre: "asc" },
      ],
    });
  }

  static async findGrouped(restaurantId: number | null | undefined) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    const categorias = await prisma.categoria.findMany({
      where: { activo: true, ...whereRestaurant },
      orderBy: { nombre: "asc" },
      include: {
        productos: {
          where: { activo: true, ...whereRestaurant },
          orderBy: { nombre: "asc" },
        },
      },
    });
    return categorias.filter((c) => c.productos.length > 0);
  }

  static async findById(restaurantId: number | null | undefined, id: number) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    const prod = await prisma.producto.findUnique({
      where: { id, ...whereRestaurant },
      include: { categoria: true },
    });
    if (!prod) throw AppError.notFound("Producto no encontrado");
    return prod;
  }

  static async create(
    restaurantId: number | null | undefined,
    data: {
      categoriaId: number;
      nombre: string;
      precio: number;
      imagen?: string;
      activo?: boolean;
    }
  ) {
    const cat = await prisma.categoria.findUniqueOrThrow({
      where: { id: data.categoriaId },
    });
    if (restaurantId != null && cat.restaurantId !== restaurantId) {
      throw AppError.badRequest("La categoría no pertenece a este restaurante");
    }

    return prisma.producto.create({
      data: {
        ...data,
        restaurantId,
        precio: data.precio,
      },
      include: { categoria: true },
    });
  }

  static async update(
    restaurantId: number | null | undefined,
    id: number,
    data: {
      categoriaId?: number;
      nombre?: string;
      precio?: number;
      imagen?: string;
      activo?: boolean;
    }
  ) {
    await this.findById(restaurantId, id);

    if (data.categoriaId) {
      const cat = await prisma.categoria.findUniqueOrThrow({
        where: { id: data.categoriaId },
      });
      if (restaurantId != null && cat.restaurantId !== restaurantId) {
        throw AppError.badRequest("La categoría no pertenece a este restaurante");
      }
    }

    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.producto.update({
      where: { id, ...whereRestaurant },
      data,
      include: { categoria: true },
    });
  }

  static async toggleActivo(restaurantId: number | null | undefined, id: number) {
    const prod = await this.findById(restaurantId, id);
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.producto.update({
      where: { id, ...whereRestaurant },
      data: { activo: !prod.activo },
    });
  }

  static async remove(restaurantId: number | null | undefined, id: number) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    const prod = await prisma.producto.findUnique({
      where: { id, ...whereRestaurant },
      include: { _count: { select: { detalles: true } } },
    });

    if (!prod) throw AppError.notFound("Producto no encontrado");
    if (prod._count.detalles > 0) {
      throw AppError.conflict("No se puede eliminar: tiene pedidos asociados");
    }

    return prisma.producto.delete({ where: { id, ...whereRestaurant } });
  }

  static async updateImage(restaurantId: number | null | undefined, id: number, imagen: string) {
    await this.findById(restaurantId, id);
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.producto.update({
      where: { id, ...whereRestaurant },
      data: { imagen },
    });
  }
}
