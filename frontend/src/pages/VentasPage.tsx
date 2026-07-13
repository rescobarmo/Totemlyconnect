import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function VentasPage() {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<any[]>([]);
  const [meseros, setMeseros] = useState<any[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filtroMesero, setFiltroMesero] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => { fetchVentas(); }, []);

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filtroMesero) params.user_id = filtroMesero;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const { data } = await api.get("/pedidos/ventas", { params });
      if (data.success) {
        setVentas(data.data.ventas);
        setMeseros(data.data.meseros);
        setTotalVentas(data.data.total_ventas);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">📊</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Ventas</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-base sm:text-lg font-bold text-emerald-600">${totalVentas.toLocaleString()}</p>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-7xl px-3 sm:px-4 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={filtroMesero} onChange={(e) => setFiltroMesero(e.target.value)} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm">
            <option value="">Todos los meseros</option>
            {meseros.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm" />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm" />
          <button onClick={fetchVentas} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Buscar</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Pedido</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Mesa</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Mesero</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium hidden sm:table-cell">Fecha</th>
                <th className="text-right px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Cargando...</td></tr>
              ) : ventas.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Sin ventas</td></tr>
              ) : (
                ventas.map((v: any) => (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-4 py-3 text-gray-900 font-medium text-sm">#{v.id}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 text-sm">Mesa {v.mesa?.numero}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-500 text-sm">{v.user?.name}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-400 text-xs sm:text-sm hidden sm:table-cell">{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 sm:px-4 py-3 text-emerald-600 font-bold text-right text-sm">${Number(v.total).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
