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

  const [personas, setPersonas] = useState(1);
  const [propinaPct, setPropinaPct] = useState(() => Number(localStorage.getItem("pago_propina") || 10));
  const [metodo, setMetodo] = useState(() => localStorage.getItem("pago_metodo") || "tarjeta");

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/pedido/${pedidoId}`)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">💳</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Pago · Pedido #{pedidoId}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-base sm:text-lg font-bold text-emerald-600">${Number(pedido?.total || 0).toLocaleString()}</p>
          </div>
        </div>
      </nav>

      {debug && <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-2"><p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{debug}</p></div>}

      <main className="mx-auto mt-4 sm:mt-6 max-w-4xl px-3 sm:px-4 pb-8 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">Subtotal</p>
              <p className="text-gray-900 font-bold text-base sm:text-xl">${Number(pedido?.total || 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">Pagado</p>
              <p className="text-emerald-600 font-bold text-base sm:text-xl">${totalPagado.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">Pendiente</p>
              <p className={`font-bold text-base sm:text-xl ${saldo > 0 ? "text-amber-600" : "text-emerald-600"}`}>${Math.max(0, saldo).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {pedido?.estado !== "cerrado" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setMode("equitativo")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                mode === "equitativo" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>Equitativo</button>
              <button onClick={() => setMode("por_items")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                mode === "por_items" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>Por Items</button>
            </div>

            {mode === "equitativo" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm text-gray-500">Personas</label>
                    <select value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm text-gray-500">Propina %</label>
                    <select value={propinaPct} onChange={(e) => setPropinaPct(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
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
                <button onClick={dividirEquitativo} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all active:scale-[0.98]">
                  Dividir en {personas} persona{personas > 1 ? "s" : ""}
                </button>
              </div>
            )}

            {mode === "por_items" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm text-gray-500">Personas</label>
                    <select value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm text-gray-500">Propina %</label>
                    <select value={propinaPct} onChange={(e) => setPropinaPct(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
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
                <button onClick={dividirEquitativo} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all active:scale-[0.98]">
                  Dividir en {personas} persona{personas > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        )}

        {pendientes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-900 font-bold mb-4 text-sm sm:text-base">Detalle de Pagos</h3>
            <div className="space-y-3">
              {pendientes.map((pago) => (
                <div key={pago.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm sm:text-base">${Number(pago.monto).toLocaleString()}</p>
                      <p className="text-gray-400 text-xs">{pago.tipoDivision}</p>
                      {itemsDePago(pago) && <p className="text-gray-400 text-xs mt-1 truncate">{itemsDePago(pago)}</p>}
                    </div>
                    {pago.estado === "pendiente" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={metodoMap[pago.id] || pago.metodo}
                          onChange={(e) => setMetodoMap((prev) => ({ ...prev, [pago.id]: e.target.value }))}
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="tarjeta">Tarjeta</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                        </select>
                        <button onClick={() => procesarPago(pago.id)} disabled={processing === pago.id} className="px-4 sm:px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98] whitespace-nowrap">
                          {processing === pago.id ? "..." : "Cobrar"}
                        </button>
                      </div>
                    ) : (
                      <span className="px-3 sm:px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap">
                        {metodoLabel(pago.metodo)} · Pagado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pagos.filter(p => p.estado === "rechazado").length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-900 font-bold mb-4 text-sm sm:text-base">Rechazados</h3>
            <div className="space-y-2">
              {pagos.filter(p => p.estado === "rechazado").map((pago) => (
                <div key={pago.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-xs sm:text-sm">${Number(pago.monto).toLocaleString()} · {metodoLabel(pago.metodo)}</p>
                    {itemsDePago(pago) && <p className="text-gray-400 text-xs truncate">{itemsDePago(pago)}</p>}
                    {pago.transaccionId && <p className="text-gray-400 text-xs truncate">{pago.transaccionId}</p>}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-600 shrink-0">
                    rechazado
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {puedeCerrar && pedido?.estado !== "cerrado" && (
          <button onClick={cerrarCuenta} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-xl transition-all active:scale-[0.98]">
            Cerrar Cuenta y Liberar Mesa
          </button>
        )}
      </main>
    </div>
  );
}
