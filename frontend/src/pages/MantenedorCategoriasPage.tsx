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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">📁</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Categorías</h1>
          </div>
          <button onClick={openCreate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98]">+ Nueva</button>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-5xl px-3 sm:px-4 pb-8">
        {loading ? <p className="text-center py-10 text-gray-400 text-sm">Cargando...</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {categorias.map((cat) => (
              <div key={cat.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between ${!cat.activo ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icono}</span>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">{cat.nombre}</p>
                    <p className="text-gray-400 text-xs">{(cat as any)._count?.productos || 0} productos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActivo(cat.id)} className={`px-2 py-1 rounded text-xs font-medium ${
                    cat.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>{cat.activo ? "Activo" : "Inactivo"}</button>
                  <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-gray-600 px-1.5 text-sm">✏️</button>
                  <button onClick={() => remove(cat.id)} className="text-gray-400 hover:text-red-500 px-1.5 text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl sm:mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar" : "Nueva"} Categoría</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <p className="text-gray-500 text-xs font-medium">Icono</p>
              <div className="grid grid-cols-10 gap-2">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setIcono(e)} className={`text-2xl p-1 rounded-lg transition-all active:scale-90 ${
                    icono === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-gray-100 hover:bg-gray-200"
                  }`}>{e}</button>
                ))}
              </div>
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
