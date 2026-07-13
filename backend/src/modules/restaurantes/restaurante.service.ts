import prisma from "../../config/database";
import bcrypt from "bcryptjs";
import { AppError } from "../../common/errors/AppError";

export class RestauranteService {
  static async findAll() {
    return prisma.restaurant.findMany({
      include: { _count: { select: { users: true, mesas: true } } },
      orderBy: { nombre: "asc" },
    });
  }

  static async findById(id: number) {
    const r = await prisma.restaurant.findUnique({ where: { id } });
    if (!r) throw AppError.notFound("Restaurante no encontrado");
    return r;
  }

  static async create(data: {
    nombre: string;
    direccion?: string;
    telefono?: string;
    adminEmail: string;
    adminPassword: string;
    adminName?: string;
  }) {
    const exists = await prisma.restaurant.findFirst({
      where: { nombre: data.nombre },
    });
    if (exists) throw AppError.conflict("Ya existe un restaurante con ese nombre");

    const restaurant = await prisma.restaurant.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
      },
    });

    const hashed = await bcrypt.hash(data.adminPassword, 12);

    await prisma.user.create({
      data: {
        name: data.adminName || `Admin ${data.nombre}`,
        email: data.adminEmail,
        password: hashed,
        role: "admin",
        restaurantId: restaurant.id,
      },
    });

    return restaurant;
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
