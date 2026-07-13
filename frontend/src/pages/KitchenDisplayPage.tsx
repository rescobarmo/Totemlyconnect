import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { Pedido, DetallePedido } from "@/types";

interface PedidoCocina extends Omit<Pedido, "mesa" | "user"> {
  mesa?: { numero: number };
  user?: { id: number; name: string };
  detalles?: (DetallePedido & { producto?: { nombre: string } })[];
  _tiempoInicio?: number;
}

const alertSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
};

export default function KitchenDisplayPage() {
  const [pedidos, setPedidos] = useState<PedidoCocina[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchPedidos();
    socket.emit("join:cocina");

    socket.on("pedido:nuevo", (data: any) => {
      alertSound();
      fetchPedidos();
    });
    socket.on("pedido:item_agregado", () => fetchPedidos());
    socket.on("pedido:entregado", () => fetchPedidos());
    socket.on("pedido:cerrado", () => fetchPedidos());

    const interval = setInterval(fetchPedidos, 30000);
    const clock = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      socket.off("pedido:nuevo");
      socket.off("pedido:item_agregado");
      socket.off("pedido:entregado");
      socket.off("pedido:cerrado");
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [socket]);

  const fetchPedidos = async () => {
    try {
      const { data } = await api.get("/mesas");
      if (data.success) {
        const activos: PedidoCocina[] = [];
        for (const mesa of data.data) {
          if (mesa.pedidos?.[0]) {
            const p = mesa.pedidos[0];
            if (p.estado === "abierto" || p.estado === "entregado") {
              activos.push({
                ...p,
                mesa: { numero: mesa.numero },
                _tiempoInicio: new Date(p.createdAt).getTime(),
              });
            }
          }
        }
        setPedidos(activos);
      }
    } finally { setLoading(false); }
  };

  const entregar = async (pedidoId: number) => {
    try { await api.post("/pedidos/entregar", { pedido_id: pedidoId }); fetchPedidos(); }
    catch (err: any) { alert(err.response?.data?.error); }
  };

  const reimprimir = async (pedidoId: number) => {
    try {
      await api.post(`/pedidos/reimprimir/${pedidoId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al imprimir");
    }
  };

  const getElapsed = (createdAt: string) => {
    const elapsed = Math.floor((now - new Date(createdAt).getTime()) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const getElapsedColor = (createdAt: string) => {
    const elapsed = (now - new Date(createdAt).getTime()) / 1000;
    if (elapsed > 600) return "text-red-500";
    if (elapsed > 300) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🍳 Cocina</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs sm:text-sm">{pedidos.length} pedidos activos</span>
          <button onClick={fetchPedidos} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-all active:scale-[0.98]">🔄 Actualizar</button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-20 text-base">Cargando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">✨</p>
          <p className="text-gray-400 text-base">Sin pedidos pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
              pedido.estado === "entregado" ? "border-emerald-300" : "border-amber-300"
            }`}>
              <div className={`px-4 py-3 flex items-center justify-between ${
                pedido.estado === "entregado" ? "bg-emerald-50" : "bg-amber-50"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-gray-900">#{pedido.id}</span>
                  <div>
                    <p className="text-gray-900 font-bold text-sm">Mesa {pedido.mesa?.numero}</p>
                    <p className="text-gray-400 text-xs">{pedido.user?.name}</p>
                  </div>
                </div>
                <span className={`text-base font-mono font-bold ${getElapsedColor(pedido.createdAt)}`}>
                  {getElapsed(pedido.createdAt)}
                </span>
              </div>

              <div className="p-4 space-y-2">
                {pedido.detalles?.filter((d) => !d.entregado).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-base font-bold text-amber-600 w-8 text-center">{item.cantidad}x</span>
                    <span className="text-gray-800 text-sm flex-1">{item.producto?.nombre}</span>
                  </div>
                ))}
                {pedido.detalles?.filter((d) => d.entregado).length === pedido.detalles?.length && (
                  <p className="text-emerald-600 text-sm text-center py-2">✅ Todo entregado</p>
                )}
              </div>

              {pedido.estado !== "entregado" && (
                <div className="p-4 pt-0 flex gap-2">
                  <button onClick={() => reimprimir(pedido.id)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all active:scale-[0.98]">
                    🖨️ Reimprimir
                  </button>
                  <button onClick={() => entregar(pedido.id)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-all active:scale-[0.98]">
                    ✅ Marcar Listo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
