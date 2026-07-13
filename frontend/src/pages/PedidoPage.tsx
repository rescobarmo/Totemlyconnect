import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { Pedido, DetallePedido, Producto, Categoria } from "@/types";

export default function PedidoPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<DetallePedido[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [catActiva, setCatActiva] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [solicitado, setSolicitado] = useState(false);
  const [itemsRemovibles, setItemsRemovibles] = useState<Set<number>>(new Set());
  const itemsAlSolicitar = useRef<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [pedidoId]);

  useEffect(() => {
    socket.emit("join:mesa", pedido?.mesaId);
    socket.on("pedido:item_agregado", (data: any) => {
      if (data.pedidoId === Number(pedidoId)) {
        setItems(data.items);
        setPedido((p) => (p ? { ...p, total: data.total } : p));
        const noEntregados = data.items.filter((i: any) => !i.entregado);
        if (noEntregados.length > 0) setSolicitado(false);
      }
    });
    socket.on("pedido:entregado", (data: any) => {
      if (data.pedidoId === Number(pedidoId)) {
        setPedido((p) => (p ? { ...p, estado: "entregado" } : p));
        loadData();
      }
    });
    return () => {
      socket.emit("leave:mesa", pedido?.mesaId);
      socket.off("pedido:item_agregado");
      socket.off("pedido:entregado");
    };
  }, [socket, pedido?.mesaId, pedidoId]);

  const loadData = async () => {
    try {
      if (!pedidoId) return;
      const [pedidoRes, catRes, prodRes] = await Promise.all([
        api.get(`/pedidos/${pedidoId}`),
        api.get("/categorias/activas"),
        api.get("/productos/agrupados"),
      ]);
      if (pedidoRes.data.success && pedidoRes.data.data) {
        const p = pedidoRes.data.data;
        setPedido(p);
        const detalles = p.detalles || [];
        setItems(detalles);
        itemsAlSolicitar.current = new Set();
        setItemsRemovibles(new Set());
        const todosEntregados = detalles.length > 0 && detalles.every((i: any) => i.entregado);
        setSolicitado(todosEntregados);
      }
      if (catRes.data.success) setCategorias(catRes.data.data);
      if (prodRes.data.success) setProductos(prodRes.data.data.flatMap((c: any) => c.productos));
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (productoId: number) => {
    if (!pedido) return;
    try {
      const { data } = await api.post("/pedidos/agregar-item", {
        pedido_id: pedido.id,
        producto_id: productoId,
        cantidad: 1,
      });
      if (data.success) {
        const nuevosItems = data.data.items as DetallePedido[];
        if (solicitado) {
          const nuevosIds = nuevosItems
            .filter((i) => !itemsAlSolicitar.current.has(i.id!))
            .map((i) => i.id!);
          if (nuevosIds.length > 0) {
            setItemsRemovibles((prev) => new Set([...prev, ...nuevosIds]));
            setSolicitado(false);
          }
        }
        setItems(nuevosItems);
        setPedido((p) => (p ? { ...p, total: data.data.total } : p));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al agregar item");
    }
  };

  const removeItem = async (detalleId: number) => {
    try {
      const { data } = await api.delete(`/pedidos/eliminar-item/${detalleId}`);
      if (data.success) {
        setItems(data.data.items);
        setPedido((p) => (p ? { ...p, total: data.data.total } : p));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al eliminar item");
    }
  };

  const entregar = async () => {
      if (!pedido) return;
      try {
        await api.post("/pedidos/entregar", { pedido_id: pedido.id });
        setPedido((p) => (p ? { ...p, estado: "entregado" } : p));
        setItems((prev) => prev.map((it) => it.entregado ? it : { ...it, entregado: true }));
      } catch (err: any) {
        alert(err.response?.data?.error || "Error al entregar");
      }
    };

  const pedir = () => {
    if (!pedido) return;
    itemsAlSolicitar.current = new Set(items.filter(i => i.id).map(i => i.id!));
    setSolicitado(true);
    socket.emit("pedir", { pedidoId: pedido.id, mesaId: pedido.mesaId, items: items.filter(i => !i.entregado) });
  };

  const productosFiltrados = catActiva
    ? productos.filter((p) => p.categoriaId === catActiva)
    : productos;

  const pendingItems = items.filter((i) => !i.entregado);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/mesas")} className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">Pedido #{pedido?.id}</h1>
              <p className="text-[10px] sm:text-xs text-gray-500">Mesa {pedido?.mesa?.numero || "..."}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <span className="text-base sm:text-lg font-bold text-emerald-600 whitespace-nowrap">${Number(pedido?.total || 0).toLocaleString()}</span>
            {pedido?.estado !== "cerrado" && pendingItems.length > 0 && !solicitado && (
              <button onClick={pedir} className="px-6 sm:px-8 py-2 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm sm:text-base font-bold rounded-xl whitespace-nowrap shadow-lg shadow-amber-200 transition-all active:scale-[0.98] animate-pulse">
                🍳 Pedir
              </button>
            )}
            {pedido?.estado !== "cerrado" && pendingItems.length > 0 && solicitado && (
              <button onClick={entregar} className="px-6 sm:px-8 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold rounded-xl whitespace-nowrap shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]">
                ✅ Entregar
              </button>
            )}
            {pedido?.estado !== "cerrado" && solicitado && pendingItems.length === 0 && items.length > 0 && (
              <button onClick={() => navigate(`/pago/${pedidoId}`)} className="px-6 sm:px-8 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-bold rounded-xl whitespace-nowrap shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                Pagar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-3 bg-white border-b border-gray-200">
            <button onClick={() => setCatActiva(null)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-[0.98] ${
              !catActiva ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
              Todos
            </button>
            {categorias.map((cat) => (
              <button key={cat.id} onClick={() => setCatActiva(cat.id)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-[0.98] ${
                catActiva === cat.id ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
                {cat.icono} {cat.nombre}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 pb-[68px] sm:pb-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 sm:gap-2">
              {productosFiltrados.map((prod) => (
                <button key={prod.id} onClick={() => addItem(prod.id)} className="bg-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-left transition-all active:scale-[0.96] hover:shadow-md flex flex-col border border-gray-200 shadow-sm hover:border-gray-300">
                  {prod.imagen && <div className="w-full aspect-square sm:aspect-[4/3] bg-gray-100 rounded sm:rounded-lg mb-1 sm:mb-1.5 overflow-hidden"><img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-contain" /></div>}
                  {!prod.imagen && <div className="w-full aspect-square sm:aspect-[4/3] bg-gray-100 rounded sm:rounded-lg mb-1 sm:mb-1.5 flex items-center justify-center text-gray-400 text-xs sm:text-sm">📷</div>}
                  <div className="flex-1 flex flex-col justify-end min-h-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 leading-tight truncate">{prod.nombre}</p>
                    <p className="text-emerald-600 text-xs sm:text-sm font-bold mt-0.5">${Number(prod.precio).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <>
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">🛒 {items.length}</span>
              <span className="text-emerald-600 font-bold text-base">${Number(pedido?.total || 0).toLocaleString()}</span>
            </div>
            <button onClick={() => setShowCart(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-sm">
              Ver Carrito
            </button>
          </div>

          <div className="sm:hidden h-[60px]" />

          {showCart && (
            <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setShowCart(false)}>
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-gray-900 font-bold text-lg">Carrito ({items.length})</h2>
                  <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Sin items</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.entregado ? "bg-gray-100" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.entregado && <span className="text-emerald-500 text-lg shrink-0">✅</span>}
                          <div className="min-w-0">
                            <p className="text-gray-900 text-sm font-medium truncate">{item.producto?.nombre}</p>
                            <p className="text-gray-500 text-xs">{item.cantidad}x ${Number(item.precioUnitario).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold ${item.entregado ? "text-emerald-600" : "text-gray-900"}`}>${Number(item.subtotal).toLocaleString()}</span>
                          {!item.entregado && (!solicitado || itemsRemovibles.has(item.id!)) && (
                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-500 text-lg leading-none w-6 h-6 flex items-center justify-center">&times;</button>
                          )}
                        </div>
                      </div>
                    )))}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-emerald-600">${Number(pedido?.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>

        <div className="hidden sm:flex w-72 lg:w-80 bg-white border-l border-gray-200 flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-gray-900 font-bold">Carrito ({items.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Sin items</p>
            ) : (
                items.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.entregado ? "bg-gray-100" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.entregado && <span className="text-emerald-500 text-lg shrink-0">✅</span>}
                      <div className="min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate">{item.producto?.nombre}</p>
                        <p className="text-gray-500 text-xs">{item.cantidad}x ${Number(item.precioUnitario).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${item.entregado ? "text-emerald-600" : "text-gray-900"}`}>${Number(item.subtotal).toLocaleString()}</span>
                      {!item.entregado && (!solicitado || itemsRemovibles.has(item.id!)) && (
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-500 text-lg leading-none w-6 h-6 flex items-center justify-center">&times;</button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-emerald-600">${Number(pedido?.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
