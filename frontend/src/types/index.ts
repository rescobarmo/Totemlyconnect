export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "mesero";
  restaurantId?: number | null;
  restaurantNombre?: string | null;
}

export interface Restaurant {
  id: number;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  icono: string | null;
  activo: boolean;
  _count?: { productos: number };
}

export interface Producto {
  id: number;
  categoriaId: number;
  nombre: string;
  precio: number;
  imagen: string | null;
  activo: boolean;
  categoria?: { id: number; nombre: string; icono: string | null };
}

export interface Mesa {
  id: number;
  numero: number;
  estado: "libre" | "ocupada" | "cuenta_cerrada";
  pedidos?: Pedido[];
}

export interface Pedido {
  id: number;
  mesaId: number;
  userId: number;
  estado: "abierto" | "entregado" | "cerrado" | "cancelado";
  total: number;
  createdAt: string;
  mesa?: Mesa;
  user?: { id: number; name: string };
  detalles?: DetallePedido[];
  pagosParciales?: PagoParcial[];
}

export interface DetallePedido {
  id: number;
  pedidoId: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  entregado: boolean;
  producto?: { id: number; nombre: string; imagen: string | null };
}

export interface PagoParcial {
  id: number;
  pedidoId: number;
  monto: number;
  metodo: "efectivo" | "tarjeta" | "transferencia";
  tipoDivision: "equitativa" | "por_items" | "personalizada";
  itemsIds: number[] | null;
  estado: "pendiente" | "aprobado" | "rechazado";
  transaccionId: string | null;
  mensajeRespuesta: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
