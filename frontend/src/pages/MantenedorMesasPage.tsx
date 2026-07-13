import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Mesa } from "@/types";

const estadoColors: Record<string, string> = {
  libre: "bg-emerald-100 text-emerald-700",
  ocupada: "bg-amber-100 text-amber-700",
  cuenta_cerrada: "bg-blue-100 text-blue-700",
};

const estadoLabels: Record<string, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  cuenta_cerrada: "Cta. Cerrada",
};

export default function MantenedorMesasPage() {
  const navigate = useNavigate();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Mesa | null>(null);
  const [numero, setNumero] = useState("");

  useEffect(() => { fetchMesas(); }, []);

  const fetchMesas = async () => {
    try {
      const { data } = await api.get("/mesas");
      if (data.success) setMesas(data.data);
    } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setNumero(""); setModal(true); };
  const openEdit = (m: Mesa) => { setEditing(m); setNumero(String(m.numero)); setModal(true); };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/mesas/${editing.id}`, { numero: parseInt(numero) });
      } else {
        await api.post("/mesas", { numero: parseInt(numero) });
      }
      setModal(false);
      fetchMesas();
    } catch (err: any) { alert(err.response?.data?.error || "Error al guardar"); }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta mesa?")) return;
    try { await api.delete(`/mesas/${id}`); fetchMesas(); }
    catch (err: any) { alert(err.response?.data?.error || "Error al eliminar"); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">🪑</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Mantenedor de Mesas</h1>
          </div>
          <button onClick={openCreate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98]">+ Nueva Mesa</button>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-5xl px-3 sm:px-4 pb-8">
        {loading ? <p className="text-center py-10 text-gray-400 text-sm">Cargando...</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {mesas.map((mesa) => (
              <div key={mesa.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 transition-all hover:shadow-md">
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">#{mesa.numero}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoColors[mesa.estado]}`}>
                  {estadoLabels[mesa.estado]}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(mesa)} className="text-gray-400 hover:text-gray-600 text-sm px-1.5 transition-colors">✏️</button>
                  {mesa.estado === "libre" && (
                    <button onClick={() => remove(mesa.id)} className="text-gray-400 hover:text-red-500 text-sm px-1.5 transition-colors">🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-xl sm:mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar" : "Nueva"} Mesa</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="px-4 py-4">
              <input type="number" min={1} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número de mesa" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Cancelar</button>
              <button onClick={save} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
