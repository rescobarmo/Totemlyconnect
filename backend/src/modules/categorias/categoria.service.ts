import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class CategoriaService {
  static async findAll(includeInactive = false) {
    return prisma.categoria.findMany({
      where: includeInactive ? {} : { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        _count: { select: { productos: true } },
      },
    });
  }

  static async findById(id: number) {
    const cat = await prisma.categoria.findUnique({
      where: { id },
      include: { productos: { where: { activo: true } } },
    });

    if (!cat) throw AppError.notFound("Categoría no encontrada");
    return cat;
  }

  static async create(data: { nombre: string; icono?: string }) {
    const exists = await prisma.categoria.findFirst({ where: { nombre: data.nombre } });
    if (exists) throw AppError.conflict("Ya existe una categoría con ese nombre");

    return prisma.categoria.create({ data });
  }

  static async update(id: number, data: { nombre?: string; icono?: string; activo?: boolean }) {
    await this.findById(id);
    return prisma.categoria.update({ where: { id }, data });
  }

  static async toggleActivo(id: number) {
    const cat = await this.findById(id);
    return prisma.categoria.update({
      where: { id },
      data: { activo: !cat.activo },
    });
  }

  static async remove(id: number) {
    const cat = await prisma.categoria.findUnique({
      where: { id },
      include: { _count: { select: { productos: true } } },
    });

    if (!cat) throw AppError.notFound("Categoría no encontrada");
    if (cat._count.productos > 0) {
      throw AppError.conflict("No se puede eliminar: tiene productos asociados");
    }

    return prisma.categoria.delete({ where: { id } });
  }
}
