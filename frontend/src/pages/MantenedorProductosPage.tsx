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
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold text-white">🍔 Productos</h1>
          </div>
          <div className="flex gap-2">
            <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} className="hidden" />
            <button onClick={() => excelRef.current?.click()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">📊 Importar Excel</button>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ Nuevo</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto..." className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
          <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value ? Number(e.target.value) : "")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-slate-400 text-sm">Img</th>
              <th className="text-left px-4 py-3 text-slate-400 text-sm">Nombre</th>
              <th className="text-left px-4 py-3 text-slate-400 text-sm">Categoría</th>
              <th className="text-right px-4 py-3 text-slate-400 text-sm">Precio</th>
              <th className="text-center px-4 py-3 text-slate-400 text-sm">Estado</th>
              <th className="text-right px-4 py-3 text-slate-400 text-sm">Acciones</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-8 text-slate-500">Cargando...</td></tr> :
                filtered.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${!p.activo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => { (document.getElementById(`img-${p.id}`) as HTMLInputElement)?.click(); }} className="block cursor-pointer">
                        {p.imagen ? <img src={p.imagen} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-600">📷</div>}
                      </button>
                      <input id={`img-${p.id}`} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const fd = new FormData();
                        fd.append("imagen", f);
                        try {
                          await api.post(`/productos/${p.id}/imagen`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                          loadData();
                        } catch (err: any) { alert(err.response?.data?.error || "Error al subir imagen"); }
                        e.target.value = "";
                      }} />
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-300">{p.categoria?.icono} {p.categoria?.nombre}</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold text-right">${Number(p.precio).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActivo(p.id)} className={`px-3 py-1 rounded text-xs font-medium ${p.activo ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-600 text-slate-400"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-white px-2">✏️</button>
                      <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-400 px-2">🗑️</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white text-xl font-bold mb-4">{editing ? "Editar" : "Nuevo"} Producto</h2>
            <div className="space-y-4">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              <select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="">Seleccionar categoría</option>
                {categorias.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
              </select>
              <input type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="Precio" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImagenFile(f); setPreview(URL.createObjectURL(f)); } }} className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="w-full py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600">
                  {preview ? "📷 Cambiar imagen" : "📷 Subir imagen"}
                </button>
                {preview && <img src={preview} alt="" className="mt-2 w-20 h-20 rounded-lg object-cover" />}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg">Cancelar</button>
              <button onClick={save} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
