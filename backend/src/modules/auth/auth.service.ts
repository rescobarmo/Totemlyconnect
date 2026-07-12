import prisma from "../../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../common/errors/AppError";
import { AuthUser } from "../../common/types";

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw AppError.unauthorized("Credenciales inválidas");
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw AppError.unauthorized("Credenciales inválidas");
    }

    const payload: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);

    return {
      user: payload,
      token,
    };
  }

  static async register(name: string, email: string, password: string, restaurantId?: number) {
    const exists = await prisma.user.findFirst({ where: { email } });

    if (exists) {
      throw AppError.conflict("El email ya está registrado");
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "mesero",
        restaurantId: restaurantId ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        restaurantId: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async me(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        restaurantId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound("Usuario no encontrado");
    }

    return user;
  }

  static async listar(restaurantId?: number) {
    const where = restaurantId ? { restaurantId } : {};
    return prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, restaurantId: true, createdAt: true },
      orderBy: { id: "asc" },
    });
  }

  static async crear(name: string, email: string, password: string, restaurantId?: number) {
    const exists = await prisma.user.findFirst({ where: { email } });
    if (exists) throw AppError.conflict("El email ya está registrado");

    const hashed = await bcrypt.hash(password, 12);

    return prisma.user.create({
      data: { name, email, password: hashed, role: "mesero", restaurantId: restaurantId ?? null },
      select: { id: true, name: true, email: true, role: true, restaurantId: true, createdAt: true },
    });
  }
}
