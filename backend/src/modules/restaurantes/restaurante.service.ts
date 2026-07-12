import prisma from "../../config/database";
import { AppError } from "../../common/errors/AppError";

export class RestauranteService {
  static async findAll() {
    return prisma.restaurant.findMany({
      orderBy: { nombre: "asc" },
    });
  }

  static async findById(id: number) {
    const r = await prisma.restaurant.findUnique({ where: { id } });
    if (!r) throw AppError.notFound("Restaurante no encontrado");
    return r;
  }

  static async create(data: { nombre: string; direccion?: string; telefono?: string }) {
    return prisma.restaurant.create({
      data: { nombre: data.nombre, direccion: data.direccion, telefono: data.telefono },
    });
  }

  static async update(id: number, data: { nombre?: string; direccion?: string; telefono?: string; activo?: boolean }) {
    await this.findById(id);
    return prisma.restaurant.update({ where: { id }, data });
  }

  static async remove(id: number) {
    await this.findById(id);
    return prisma.restaurant.update({ where: { id }, data: { activo: false } });
  }
}
