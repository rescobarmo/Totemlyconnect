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
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">← Volver</button>
            <h1 className="text-2xl font-bold text-white">📊 Ventas</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Total</p>
            <p className="text-2xl font-bold text-emerald-400">${totalVentas.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Filtros */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <select value={filtroMesero} onChange={(e) => setFiltroMesero(e.target.value)} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
            <option value="">Todos los meseros</option>
            {meseros.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
          <button onClick={fetchVentas} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Buscar</button>
        </div>

        {/* Tabla */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">Pedido</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">Mesa</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">Mesero</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">Fecha</th>
                <th className="text-right px-4 py-3 text-slate-400 text-sm font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">Cargando...</td></tr>
              ) : ventas.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">Sin ventas</td></tr>
              ) : (
                ventas.map((v: any) => (
                  <tr key={v.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white font-medium">#{v.id}</td>
                    <td className="px-4 py-3 text-white">Mesa {v.mesa?.numero}</td>
                    <td className="px-4 py-3 text-slate-300">{v.user?.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold text-right">${Number(v.total).toLocaleString()}</td>
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
