import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { Pedido, PagoParcial } from "@/types";

export default function PagoPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const metodoLabel = (m: string) => ({ tarjeta: "Tarjeta", efectivo: "Efectivo", transferencia: "Transferencia" }[m] || m);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pagos, setPagos] = useState<PagoParcial[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [debug, setDebug] = useState("");
  const inicializado = useRef(false);

  // División equitativa (persistidos en localStorage)
  const [personas, setPersonas] = useState(1);
  const [propinaPct, setPropinaPct] = useState(() => Number(localStorage.getItem("pago_propina") || 10));
  const [metodo, setMetodo] = useState(() => localStorage.getItem("pago_metodo") || "tarjeta");

  // División por items
  const [mode, setMode] = useState<"equitativo" | "por_items">("equitativo");
  const [metodoMap, setMetodoMap] = useState<Record<number, string>>({});

  useEffect(() => { loadData(); }, [pedidoId]);

  useEffect(() => { localStorage.setItem("pago_personas", String(personas)); }, [personas]);
  useEffect(() => { localStorage.setItem("pago_propina", String(propinaPct)); }, [propinaPct]);

  useEffect(() => {
    socket.on("pago:procesado", () => loadData());
    socket.on("pedido:cerrado", () => navigate("/mesas"));
    return () => { socket.off("pago:procesado"); socket.off("pedido:cerrado"); };
  }, [socket]);

  const loadData = async () => {
    try {
      const [pedidoRes, pagosRes] = await Promise.all([
        api.get(`/pedidos/${pedidoId}`),
        api.get(`/pagos/${pedidoId}`),
      ]);
      if (pedidoRes.data.success && pedidoRes.data.data) {
        setPedido(pedidoRes.data.data);
      }
      if (pagosRes.data.success) setPagos(pagosRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || inicializado.current) return;
    inicializado.current = true;
    if (pagos.length === 0) {
      setPersonas(1);
      localStorage.removeItem("pago_personas");
    } else {
      const saved = localStorage.getItem("pago_personas");
      if (saved) setPersonas(Number(saved));
    }
  }, [loading, pagos]);

  useEffect(() => {
    setMetodoMap((prev) => {
      const next = { ...prev };
      pagos.filter((p) => p.estado === "pendiente").forEach((p) => {
        if (!next[p.id]) next[p.id] = p.metodo || "tarjeta";
      });
      return next;
    });
  }, [pagos]);

  const dividirEquitativo = async () => {
    if (!pedido) { setDebug("ERROR: pedido no cargado"); return; }
    setDebug(`Dividiendo: ${personas} personas, pedido ${pedido.id}`);
    console.log("[Dividir] personas:", personas, "pedidoId:", pedido.id);
    try {
      const { data } = await api.post("/pagos/dividir-equitativo", {
        pedido_id: pedido.id,
        personas,
        metodo,
        propina_pct: propinaPct,
      });
      console.log("[Dividir] response:", data);
      if (data.success) {
        const nuevos = data.data.pagos.map((p: any) => ({
          ...p,
          estado: "pendiente" as const,
          pedidoId: pedido.id,
          metodo: metodo as any,
          tipoDivision: "equitativo" as const,
          itemsIds: null,
          transaccionId: null,
          mensajeRespuesta: null,
        }));
        console.log("[Dividir] nuevos pagos:", nuevos.length, nuevos);
        setDebug(`OK: ${nuevos.length} pagos creados`);
        setPagos(nuevos);
      } else {
        setDebug("ERROR en respuesta: " + JSON.stringify(data));
      }
    } catch (err: any) {
      setDebug("ERROR: " + (err.response?.data?.error || err.message));
      alert(err.response?.data?.error || "Error al dividir");
    }
  };

  const procesarPago = async (pagoId: number) => {
    setProcessing(pagoId);
    const metodo = metodoMap[pagoId];
    try {
      const { data } = await api.post("/pagos/procesar", { pago_id: pagoId, metodo });
      setMetodoMap((prev) => { const n = { ...prev }; delete n[pagoId]; return n; });
      setPagos((prev) => prev.map((p) =>
        p.id === pagoId
          ? { ...p, estado: "aprobado", metodo: metodo as any, transaccionId: data.data.transaccion_id, mensajeRespuesta: data.data.mensaje }
          : p
      ));
    } catch (err: any) {
      if (err.response?.status === 402 && err.response?.data?.data) {
        setMetodoMap((prev) => { const n = { ...prev }; delete n[pagoId]; return n; });
        setPagos((prev) => prev.map((p) =>
          p.id === pagoId
            ? { ...p, estado: "rechazado", metodo: metodo as any, mensajeRespuesta: err.response.data.data.mensaje }
            : p
        ));
      } else {
        alert(err.response?.data?.error || "Error al procesar");
      }
    } finally {
      setProcessing(null);
    }
  };

  const cerrarCuenta = async () => {
    if (!pedido) return;
    try {
      await api.post("/pagos/cerrar-cuenta", { pedido_id: pedido.id });
      navigate("/mesas");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al cerrar cuenta");
    }
  };

  const totalPagado = pagos.filter((p) => p.estado === "aprobado").reduce((s, p) => s + Number(p.monto), 0);
  const totalPagos = pagos.filter((p) => p.estado !== "rechazado").reduce((s, p) => s + Number(p.monto), 0);
  const saldo = Number(pedido?.total || 0) - totalPagado;
  const pendientes = pagos.filter((p) => p.estado !== "rechazado");
  const puedeCerrar = totalPagado >= totalPagos && pagos.length > 0;

  const detalleMap = new Map((pedido?.detalles || []).map((d) => [d.id, d.producto?.nombre || `Item #${d.productoId}`]));
  const itemsDePago = (pago: PagoParcial) => {
    if (!pago.itemsIds || !Array.isArray(pago.itemsIds) || pago.itemsIds.length === 0) return null;
    return pago.itemsIds.map((id) => detalleMap.get(id)).filter(Boolean).join(", ");
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/pedido/${pedidoId}`)} className="text-slate-400 hover:text-white text-lg">←</button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">Pago · Pedido #{pedidoId}</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">${Number(pedido?.total || 0).toLocaleString()}</p>
          </div>
        </div>
      </header>

      {debug && <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2"><p className="text-xs text-amber-400 bg-slate-800 rounded px-3 py-2">{debug}</p></div>}

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Resumen */}
        <div className="bg-slate-800 rounded-xl p-4 sm:p-6 grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-700/50 rounded-lg p-3 sm:p-4"><p className="text-slate-400 text-sm sm:text-base">Subtotal</p><p className="text-white font-bold text-lg sm:text-2xl">${Number(pedido?.total || 0).toLocaleString()}</p></div>
          <div className="bg-slate-700/50 rounded-lg p-3 sm:p-4"><p className="text-slate-400 text-sm sm:text-base">Pagado</p><p className="text-emerald-400 font-bold text-lg sm:text-2xl">${totalPagado.toLocaleString()}</p></div>
          <div className="bg-slate-700/50 rounded-lg p-3 sm:p-4"><p className="text-slate-400 text-sm sm:text-base">Pendiente</p><p className={`font-bold text-lg sm:text-2xl ${saldo > 0 ? "text-amber-400" : "text-emerald-400"}`}>${Math.max(0, saldo).toLocaleString()}</p></div>
        </div>

        {/* Dividir */}
        {pedido?.estado !== "cerrado" && (
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setMode("equitativo")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium ${mode === "equitativo" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>Equitativo</button>
              <button onClick={() => setMode("por_items")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium ${mode === "por_items" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>Por Items</button>
            </div>

            {mode === "equitativo" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm text-slate-400">Personas</label>
                    <select value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm text-slate-400">Propina %</label>
                    <select value={propinaPct} onChange={(e) => setPropinaPct(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                      <option value={20}>20%</option>
                      <option value={25}>25%</option>
                      <option value={30}>30%</option>
                    </select>
                  </div>
                </div>
                <button onClick={dividirEquitativo} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base">
                  Dividir en {personas} persona{personas > 1 ? "s" : ""}
                </button>
              </div>
            )}

            {mode === "por_items" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm text-slate-400">Personas</label>
                    <select value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm text-slate-400">Propina %</label>
                    <select value={propinaPct} onChange={(e) => setPropinaPct(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                      <option value={20}>20%</option>
                      <option value={25}>25%</option>
                      <option value={30}>30%</option>
                    </select>
                  </div>
                </div>
                <button onClick={dividirEquitativo} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base">
                  Dividir en {personas} persona{personas > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pagos Pendientes */}
        {pendientes.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-white font-bold mb-4 text-sm sm:text-base">Detalle de Pagos</h3>
            <div className="space-y-3">
              {pendientes.map((pago) => (
                <div key={pago.id} className="bg-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base">${Number(pago.monto).toLocaleString()}</p>
                      <p className="text-slate-400 text-xs">{pago.tipoDivision}</p>
                      {itemsDePago(pago) && <p className="text-slate-500 text-xs mt-1 truncate">{itemsDePago(pago)}</p>}
                    </div>
                    {pago.estado === "pendiente" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={metodoMap[pago.id] || pago.metodo}
                          onChange={(e) => setMetodoMap((prev) => ({ ...prev, [pago.id]: e.target.value }))}
                          className="px-2 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-xs sm:text-sm"
                        >
                          <option value="tarjeta">Tarjeta</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                        </select>
                        <button onClick={() => procesarPago(pago.id)} disabled={processing === pago.id} className="px-4 sm:px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap">
                          {processing === pago.id ? "..." : "Cobrar"}
                        </button>
                      </div>
                    ) : (
                      <span className="px-3 sm:px-4 py-2 bg-emerald-600/30 text-emerald-400 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap">
                        {metodoLabel(pago.metodo)} · Pagado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de rechazados */}
        {pagos.filter(p => p.estado === "rechazado").length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-white font-bold mb-4 text-sm sm:text-base">Rechazados</h3>
            <div className="space-y-2">
              {pagos.filter(p => p.estado === "rechazado").map((pago) => (
                <div key={pago.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs sm:text-sm">${Number(pago.monto).toLocaleString()} · {metodoLabel(pago.metodo)}</p>
                    {itemsDePago(pago) && <p className="text-slate-500 text-xs truncate">{itemsDePago(pago)}</p>}
                    {pago.transaccionId && <p className="text-slate-500 text-xs truncate">{pago.transaccionId}</p>}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-red-500/20 text-red-400 shrink-0">
                    rechazado
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cerrar cuenta */}
        {puedeCerrar && pedido?.estado !== "cerrado" && (
          <button onClick={cerrarCuenta} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base sm:text-lg font-bold rounded-xl transition active:scale-[0.98]">
            Cerrar Cuenta y Liberar Mesa
          </button>
        )}
      </main>
    </div>
  );
}
