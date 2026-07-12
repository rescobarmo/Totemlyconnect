import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class ProductoService {
  static async findAll(includeInactive = false) {
    return prisma.producto.findMany({
      where: includeInactive ? {} : { activo: true },
      include: {
        categoria: { select: { id: true, nombre: true, icono: true } },
      },
      orderBy: [
        { categoria: { nombre: "asc" } },
        { nombre: "asc" },
      ],
    });
  }

  static async findGrouped() {
    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        productos: {
          where: { activo: true },
          orderBy: { nombre: "asc" },
        },
      },
    });
    return categorias.filter((c) => c.productos.length > 0);
  }

  static async findById(id: number) {
    const prod = await prisma.producto.findUnique({
      where: { id },
      include: { categoria: true },
    });
    if (!prod) throw AppError.notFound("Producto no encontrado");
    return prod;
  }

  static async create(data: {
    categoriaId: number;
    nombre: string;
    precio: number;
    imagen?: string;
    activo?: boolean;
  }) {
    await prisma.categoria.findUniqueOrThrow({
      where: { id: data.categoriaId },
    });

    return prisma.producto.create({
      data: {
        ...data,
        precio: data.precio,
      },
      include: { categoria: true },
    });
  }

  static async update(
    id: number,
    data: {
      categoriaId?: number;
      nombre?: string;
      precio?: number;
      imagen?: string;
      activo?: boolean;
    }
  ) {
    await this.findById(id);

    if (data.categoriaId) {
      await prisma.categoria.findUniqueOrThrow({
        where: { id: data.categoriaId },
      });
    }

    return prisma.producto.update({
      where: { id },
      data,
      include: { categoria: true },
    });
  }

  static async toggleActivo(id: number) {
    const prod = await this.findById(id);
    return prisma.producto.update({
      where: { id },
      data: { activo: !prod.activo },
    });
  }

  static async remove(id: number) {
    const prod = await prisma.producto.findUnique({
      where: { id },
      include: { _count: { select: { detalles: true } } },
    });

    if (!prod) throw AppError.notFound("Producto no encontrado");
    if (prod._count.detalles > 0) {
      throw AppError.conflict("No se puede eliminar: tiene pedidos asociados");
    }

    return prisma.producto.delete({ where: { id } });
  }

  static async updateImage(id: number, imagen: string) {
    await this.findById(id);
    return prisma.producto.update({
      where: { id },
      data: { imagen },
    });
  }
}
