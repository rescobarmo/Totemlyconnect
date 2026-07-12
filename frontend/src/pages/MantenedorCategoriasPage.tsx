import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Categoria } from "@/types";

const EMOJIS = ["☕", "🥤", "🥪", "🍰", "🧃", "🍕", "🍔", "🥗", "🍜", "🍳", "🌮", "🌯", "🥙", "🍣", "🍱", "🍩", "🍪", "🎂", "🧊", "🍺"];

export default function MantenedorCategoriasPage() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState("☕");

  useEffect(() => { fetchCategorias(); }, []);

  const fetchCategorias = async () => {
    try {
      const { data } = await api.get("/categorias");
      if (data.success) setCategorias(data.data);
    } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setNombre(""); setIcono("☕"); setModal(true); };
  const openEdit = (cat: Categoria) => { setEditing(cat); setNombre(cat.nombre); setIcono(cat.icono || "☕"); setModal(true); };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/categorias/${editing.id}`, { nombre, icono });
      } else {
        await api.post("/categorias", { nombre, icono });
      }
      setModal(false);
      fetchCategorias();
    } catch (err: any) { alert(err.response?.data?.error || "Error al guardar"); }
  };

  const toggleActivo = async (id: number) => {
    await api.patch(`/categorias/${id}/toggle`);
    fetchCategorias();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try { await api.delete(`/categorias/${id}`); fetchCategorias(); }
    catch (err: any) { alert(err.response?.data?.error || "Error al eliminar"); }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold text-white">📁 Categorías</h1>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">+ Nueva</button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        {loading ? <p className="text-slate-400 text-center py-10">Cargando...</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias.map((cat) => (
              <div key={cat.id} className={`bg-slate-800 rounded-xl p-4 flex items-center justify-between ${!cat.activo ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icono}</span>
                  <div>
                    <p className="text-white font-medium">{cat.nombre}</p>
                    <p className="text-slate-400 text-xs">{(cat as any)._count?.productos || 0} productos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActivo(cat.id)} className={`px-3 py-1 rounded text-xs font-medium ${cat.activo ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-600 text-slate-400"}`}>
                    {cat.activo ? "Activo" : "Inactivo"}
                  </button>
                  <button onClick={() => openEdit(cat)} className="text-slate-400 hover:text-white px-2">✏️</button>
                  <button onClick={() => remove(cat.id)} className="text-slate-400 hover:text-red-400 px-2">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white text-xl font-bold mb-4">{editing ? "Editar" : "Nueva"} Categoría</h2>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4" />
            <p className="text-slate-400 text-sm mb-2">Icono</p>
            <div className="grid grid-cols-10 gap-2 mb-4">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setIcono(e)} className={`text-2xl p-1 rounded-lg ${icono === e ? "bg-blue-600 ring-2 ring-blue-400" : "bg-slate-700 hover:bg-slate-600"}`}>{e}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg">Cancelar</button>
              <button onClick={save} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
