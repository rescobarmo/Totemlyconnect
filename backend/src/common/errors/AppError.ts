export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static unauthorized(message = "No autorizado") {
    return new AppError(message, 401);
  }

  static forbidden(message = "Acceso denegado") {
    return new AppError(message, 403);
  }

  static notFound(message = "Recurso no encontrado") {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static internal(message = "Error interno del servidor") {
    return new AppError(message, 500, false);
  }
}
