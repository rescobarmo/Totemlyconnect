import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Mesa } from "@/types";

const estadoColors: Record<string, string> = {
  libre: "bg-emerald-500/20 text-emerald-400",
  ocupada: "bg-amber-500/20 text-amber-400",
  cuenta_cerrada: "bg-blue-500/20 text-blue-400",
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
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold text-white">🪑 Mantenedor de Mesas</h1>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">+ Nueva Mesa</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {loading ? <p className="text-slate-400 text-center py-10">Cargando...</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {mesas.map((mesa) => (
              <div key={mesa.id} className="bg-slate-800 rounded-xl p-5 flex flex-col items-center gap-3">
                <span className="text-4xl font-bold text-white">#{mesa.numero}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoColors[mesa.estado]}`}>
                  {estadoLabels[mesa.estado]}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(mesa)} className="text-slate-400 hover:text-white text-sm px-2">✏️</button>
                  {mesa.estado === "libre" && (
                    <button onClick={() => remove(mesa.id)} className="text-slate-400 hover:text-red-400 text-sm px-2">🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white text-xl font-bold mb-4">{editing ? "Editar" : "Nueva"} Mesa</h2>
            <input type="number" min={1} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número de mesa" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg">Cancelar</button>
              <button onClick={save} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
