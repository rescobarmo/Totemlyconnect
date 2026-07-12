import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class CategoriaService {
  static async findAll(restaurantId?: number | null, includeInactive = false) {
    const whereRestaurant = restaurantId != null ? { restaurantId } : {};
    return prisma.categoria.findMany({
      where: { ...whereRestaurant, ...(includeInactive ? {} : { activo: true }) },
      orderBy: { nombre: "asc" },
      include: {
        _count: { select: { productos: true } },
      },
    });
  }

  static async findById(id: number, restaurantId?: number | null) {
    const cat = await prisma.categoria.findUnique({
      where: { id },
      include: { productos: { where: { activo: true } } },
    });

    if (!cat) throw AppError.notFound("Categoría no encontrada");
    if (restaurantId != null && cat.restaurantId !== restaurantId) {
      throw AppError.notFound("Categoría no encontrada");
    }
    return cat;
  }

  static async create(restaurantId: number | null | undefined, data: { nombre: string; icono?: string }) {
    const whereUnique: any = { nombre: data.nombre };
    if (restaurantId != null) whereUnique.restaurantId = restaurantId;
    const exists = await prisma.categoria.findFirst({
      where: whereUnique,
    });
    if (exists) throw AppError.conflict("Ya existe una categoría con ese nombre");

    return prisma.categoria.create({ data: { ...data, restaurantId } });
  }

  static async update(
    id: number,
    data: { nombre?: string; icono?: string; activo?: boolean },
    restaurantId?: number | null
  ) {
    await this.findById(id, restaurantId);

    if (data.nombre) {
      const whereUnique: any = { nombre: data.nombre, id: { not: id } };
      if (restaurantId != null) whereUnique.restaurantId = restaurantId;
      const exists = await prisma.categoria.findFirst({
        where: whereUnique,
      });
      if (exists) throw AppError.conflict("Ya existe una categoría con ese nombre");
    }

    return prisma.categoria.update({ where: { id }, data });
  }

  static async toggleActivo(id: number, restaurantId?: number | null) {
    const cat = await this.findById(id, restaurantId);
    return prisma.categoria.update({
      where: { id },
      data: { activo: !cat.activo },
    });
  }

  static async remove(id: number, restaurantId?: number | null) {
    const cat = await prisma.categoria.findUnique({
      where: { id },
      include: { _count: { select: { productos: true } } },
    });

    if (!cat) throw AppError.notFound("Categoría no encontrada");
    if (restaurantId != null && cat.restaurantId !== restaurantId) throw AppError.notFound("Categoría no encontrada");
    if (cat._count.productos > 0) {
      throw AppError.conflict("No se puede eliminar: tiene productos asociados");
    }

    return prisma.categoria.delete({ where: { id } });
  }
}
