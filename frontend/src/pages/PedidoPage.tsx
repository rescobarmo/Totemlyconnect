import { useState, useEffect } from "react";
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

  useEffect(() => {
    loadData();
  }, [pedidoId]);

  useEffect(() => {
    socket.emit("join:mesa", pedido?.mesaId);
    socket.on("pedido:item_agregado", (data: any) => {
      if (data.pedidoId === Number(pedidoId)) {
        setItems(data.items);
        setPedido((p) => (p ? { ...p, total: data.total } : p));
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
        setItems(p.detalles || []);
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
        setItems(data.data.items);
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
    setSolicitado(true);
    socket.emit("pedir", { pedidoId: pedido.id, mesaId: pedido.mesaId, items: items.filter(i => !i.entregado) });
  };

  const productosFiltrados = catActiva
    ? productos.filter((p) => p.categoriaId === catActiva)
    : productos;

  const pendingItems = items.filter((i) => !i.entregado);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-3 sm:px-4 py-2 sm:py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/mesas")} className="text-slate-400 hover:text-white text-lg shrink-0">←</button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-white truncate">Pedido #{pedido?.id}</h1>
              <p className="text-[10px] sm:text-xs text-slate-400">Mesa {pedido?.mesa?.numero || "..."}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <span className="text-base sm:text-xl font-bold text-emerald-400 whitespace-nowrap">${Number(pedido?.total || 0).toLocaleString()}</span>
            {pedido?.estado !== "cerrado" && pendingItems.length > 0 && !solicitado && (
              <button onClick={pedir} className="px-8 sm:px-10 py-3 sm:py-4 bg-amber-600 hover:bg-amber-700 text-white text-base sm:text-lg font-bold rounded-xl whitespace-nowrap shadow-lg shadow-amber-600/30 animate-pulse">
                🍳 Pedir
              </button>
            )}
            {pedido?.estado !== "cerrado" && pendingItems.length > 0 && solicitado && (
              <button onClick={entregar} className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base sm:text-lg font-bold rounded-xl whitespace-nowrap shadow-lg shadow-emerald-600/30">
                ✅ Entregar
              </button>
            )}
            {pedido?.estado !== "cerrado" && solicitado && pendingItems.length === 0 && items.length > 0 && (
              <button onClick={() => navigate(`/pago/${pedidoId}`)} className="px-8 sm:px-10 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg font-bold rounded-xl whitespace-nowrap shadow-lg shadow-blue-600/30">
                Pagar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Productos */}
        <div className="flex-1 flex flex-col">
          {/* Categorías */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-4 bg-slate-800/50">
            <button onClick={() => setCatActiva(null)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition ${!catActiva ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
              Todos
            </button>
            {categorias.map((cat) => (
              <button key={cat.id} onClick={() => setCatActiva(cat.id)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition ${catActiva === cat.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                {cat.icono} {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid productos */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 pb-[68px] sm:pb-4">
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {productosFiltrados.map((prod) => (
                <button key={prod.id} onClick={() => addItem(prod.id)} disabled={solicitado} className={`bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-left transition flex flex-col border border-slate-700/20 ${solicitado ? "opacity-40 cursor-not-allowed" : "active:scale-[0.96] active:bg-slate-700"}`}>
                  {prod.imagen && <div className="w-full aspect-[4/3] sm:aspect-video bg-slate-700 rounded sm:rounded-lg mb-1.5 sm:mb-2 overflow-hidden"><img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" /></div>}
                  {!prod.imagen && <div className="w-full aspect-[4/3] sm:aspect-video bg-slate-700 rounded sm:rounded-lg mb-1.5 sm:mb-2 flex items-center justify-center text-slate-500 text-sm sm:text-base">📷</div>}
                  <div className="flex-1 flex flex-col justify-end min-h-0">
                    <p className="text-xs sm:text-sm font-medium text-white leading-tight truncate">{prod.nombre}</p>
                    <p className="text-emerald-400 text-xs sm:text-sm font-bold mt-0.5">${Number(prod.precio).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Carrito - sidebar en desktop, barra inferior + overlay en mobile */}
        <>
          {/* Barra inferior carrito (mobile) - siempre visible */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-800 border-t border-slate-700 px-4 py-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">🛒 {items.length}</span>
              <span className="text-emerald-400 font-bold text-base">${Number(pedido?.total || 0).toLocaleString()}</span>
            </div>
            <button onClick={() => setShowCart(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg active:scale-95 transition">
              Ver Carrito
            </button>
          </div>

          {/* Espaciador para la barra inferior */}
          <div className="sm:hidden h-[60px]" />

          {/* Overlay mobile */}
          {showCart && (
            <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setShowCart(false)}>
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <h2 className="text-white font-bold text-lg">Carrito ({items.length})</h2>
                  <button onClick={() => setShowCart(false)} className="text-slate-400 text-2xl">×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Sin items</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.entregado ? "bg-slate-700/50" : "bg-slate-700"}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.entregado && <span className="text-emerald-400 text-lg shrink-0">✅</span>}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{item.producto?.nombre}</p>
                            <p className="text-slate-400 text-xs">{item.cantidad}x ${Number(item.precioUnitario).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold ${item.entregado ? "text-emerald-400" : "text-white"}`}>${Number(item.subtotal).toLocaleString()}</span>
                          {!item.entregado && !solicitado && (
                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 text-lg">×</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-slate-700">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-emerald-400">${Number(pedido?.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>

        {/* Carrito sidebar desktop */}
        <div className="hidden sm:flex w-72 lg:w-80 bg-slate-800 border-l border-slate-700 flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-white font-bold">Carrito ({items.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Sin items</p>
            ) : (
                items.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.entregado ? "bg-slate-700/50" : "bg-slate-700"}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.entregado && <span className="text-emerald-400 text-lg shrink-0">✅</span>}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.producto?.nombre}</p>
                        <p className="text-slate-400 text-xs">{item.cantidad}x ${Number(item.precioUnitario).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${item.entregado ? "text-emerald-400" : "text-white"}`}>${Number(item.subtotal).toLocaleString()}</span>
                      {!item.entregado && !solicitado && (
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 text-lg">×</button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
          <div className="p-4 border-t border-slate-700">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-emerald-400">${Number(pedido?.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
