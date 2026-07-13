import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Producto, Categoria } from "@/types";

export default function MantenedorProductosPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState<number | "">("");

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState({ nombre: "", precio: "", categoriaId: "" });
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([api.get("/productos"), api.get("/categorias")]);
      if (p.data.success) setProductos(p.data.data);
      if (c.data.success) setCategorias(c.data.data);
    } finally { setLoading(false); }
  };

  const filtered = productos.filter((p) => {
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (filtroCat && p.categoriaId !== filtroCat) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm({ nombre: "", precio: "", categoriaId: "" }); setPreview(null); setImagenFile(null); setModal(true); };
  const openEdit = (p: Producto) => { setEditing(p); setForm({ nombre: p.nombre, precio: String(p.precio), categoriaId: String(p.categoriaId) }); setPreview(p.imagen); setImagenFile(null); setModal(true); };

  const save = async () => {
    try {
      const body = { nombre: form.nombre, precio: parseFloat(form.precio), categoriaId: parseInt(form.categoriaId) };
      let prod: any;
      if (editing) {
        const { data } = await api.put(`/productos/${editing.id}`, body);
        prod = data.data;
      } else {
        const { data } = await api.post("/productos", body);
        prod = data.data;
      }
      if (imagenFile && prod?.id) {
        const fd = new FormData();
        fd.append("imagen", imagenFile);
        await api.post(`/productos/${prod.id}/imagen`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setModal(false);
      loadData();
    } catch (err: any) { alert(err.response?.data?.error || "Error al guardar"); }
  };

  const toggleActivo = async (id: number) => { await api.patch(`/productos/${id}/toggle`); loadData(); };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try { await api.delete(`/productos/${id}`); loadData(); }
    catch (err: any) { alert(err.response?.data?.error || "Error al eliminar"); }
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("archivo", file);
    try {
      const { data } = await api.post("/productos/importar-excel", fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert(`Importados: ${data.data.creados} | Errores: ${data.data.errores}`);
      loadData();
    } catch (err: any) { alert(err.response?.data?.error || "Error al importar"); }
    if (excelRef.current) excelRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">🍔</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Productos</h1>
          </div>
          <div className="flex gap-2">
            <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} className="hidden" />
            <button onClick={() => excelRef.current?.click()} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98]">📊 Importar Excel</button>
            <button onClick={openCreate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98]">+ Nuevo</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-6xl px-3 sm:px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto..." className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value ? Number(e.target.value) : "")} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Img</th>
              <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Nombre</th>
              <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium hidden sm:table-cell">Categoría</th>
              <th className="text-right px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Precio</th>
              <th className="text-center px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Estado</th>
              <th className="text-right px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Acciones</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Cargando...</td></tr> :
                filtered.map((p) => (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!p.activo ? "opacity-50" : ""}`}>
                    <td className="px-3 sm:px-4 py-3">
                      {p.imagen ? <img src={p.imagen} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" /> : <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">📷</div>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-900 font-medium text-sm">{p.nombre}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-500 text-sm hidden sm:table-cell">{p.categoria?.icono} {p.categoria?.nombre}</td>
                    <td className="px-3 sm:px-4 py-3 text-emerald-600 font-bold text-right text-sm">${Number(p.precio).toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <button onClick={() => toggleActivo(p.id)} className={`px-2 py-1 rounded text-xs font-medium ${
                        p.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>{p.activo ? "Activo" : "Inactivo"}</button>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-gray-600 px-1.5 text-sm">✏️</button>
                      <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-500 px-1.5 text-sm">🗑️</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl sm:mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar" : "Nuevo"} Producto</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Seleccionar categoría</option>
                {categorias.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
              </select>
              <input type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="Precio" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImagenFile(f); setPreview(URL.createObjectURL(f)); } }} className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="w-full py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-200 text-sm transition-all active:scale-[0.98]">
                  {preview ? "📷 Cambiar imagen" : "📷 Subir imagen"}
                </button>
                {preview && <img src={preview} alt="" className="mt-2 w-16 h-16 rounded-lg object-cover" />}
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
