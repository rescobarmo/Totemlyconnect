import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("join:restaurant", (restaurantId: number) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`[Socket] ${socket.id} joined restaurant:${restaurantId}`);
    });

    socket.on("leave:restaurant", (restaurantId: number) => {
      socket.leave(`restaurant:${restaurantId}`);
    });

    socket.on("join:mesa", (mesaId: number) => {
      socket.join(`mesa:${mesaId}`);
      console.log(`[Socket] ${socket.id} joined mesa:${mesaId}`);
    });

    socket.on("leave:mesa", (mesaId: number) => {
      socket.leave(`mesa:${mesaId}`);
    });

    socket.on("join:cocina", () => {
      socket.join("cocina");
      console.log(`[Socket] ${socket.id} joined cocina`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io no inicializado");
  return io;
}

// ============================================================
// Event helpers - emit events from services
// ============================================================

export const events = {
  mesaEstado(mesaId: number, data: { mesaId: number; estado: string; numero: number }, restaurantId?: number) {
    const emitTo = [getIO(), getIO().to(`mesa:${mesaId}`)];
    if (restaurantId) emitTo.push(getIO().to(`restaurant:${restaurantId}`));
    emitTo.forEach(e => e.emit("mesa:estado", data));
  },

  pedidoCreado(mesaId: number, data: any, restaurantId?: number) {
    getIO().to(`mesa:${mesaId}`).emit("pedido:creado", data);
    getIO().to("cocina").emit("pedido:nuevo", data);
    if (restaurantId) getIO().to(`restaurant:${restaurantId}`).emit("pedido:nuevo", { ...data, restaurantId });
  },

  pedidoItemAgregado(mesaId: number, data: any, restaurantId?: number) {
    const emitTo = [getIO().to(`mesa:${mesaId}`)];
    if (restaurantId) emitTo.push(getIO().to(`restaurant:${restaurantId}`));
    emitTo.forEach(e => e.emit("pedido:item_agregado", data));
  },

  pedidoEntregado(mesaId: number, data: any, restaurantId?: number) {
    const emitTo = [getIO().to(`mesa:${mesaId}`)];
    if (restaurantId) emitTo.push(getIO().to(`restaurant:${restaurantId}`));
    emitTo.forEach(e => e.emit("pedido:entregado", data));
  },

  pedidoCerrado(mesaId: number, data: any, restaurantId?: number) {
    const emitTo = [getIO().to(`mesa:${mesaId}`)];
    if (restaurantId) emitTo.push(getIO().to(`restaurant:${restaurantId}`));
    emitTo.forEach(e => e.emit("pedido:cerrado", data));
  },

  pagoProcesado(mesaId: number, data: any, restaurantId?: number) {
    const emitTo = [getIO().to(`mesa:${mesaId}`)];
    if (restaurantId) emitTo.push(getIO().to(`restaurant:${restaurantId}`));
    emitTo.forEach(e => e.emit("pago:procesado", data));
  },
};
