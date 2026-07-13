import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface Restaurante {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  _count?: { users: number; mesas: number };
}

export default function RestaurantesPage() {
  const navigate = useNavigate();
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", telefono: "", adminName: "", adminEmail: "", adminPassword: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get("/restaurantes");
      if (data.success) setRestaurantes(data.data);
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ nombre: "", direccion: "", telefono: "", adminName: "", adminEmail: "", adminPassword: "" });
    setModal(true);
  };

  const openEdit = (r: Restaurante) => {
    setEditId(r.id);
    setForm({ nombre: r.nombre, direccion: r.direccion || "", telefono: r.telefono || "", adminName: "", adminEmail: "", adminPassword: "" });
    setModal(true);
  };

  const save = async () => {
    try {
      if (editId) {
        await api.put(`/restaurantes/${editId}`, { nombre: form.nombre, direccion: form.direccion, telefono: form.telefono });
      } else {
        await api.post("/restaurantes", {
          nombre: form.nombre,
          direccion: form.direccion,
          telefono: form.telefono,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        });
      }
      setModal(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al guardar");
    }
  };

  const toggleActivo = async (r: Restaurante) => {
    try {
      await api.put(`/restaurantes/${r.id}`, { activo: !r.activo });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al actualizar");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold text-white">🏪 Restaurantes</h1>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ Nuevo</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Nombre</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Dirección</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Usuarios</th>
                <th className="text-center px-4 py-3 text-slate-400 text-sm">Activo</th>
                <th className="text-center px-4 py-3 text-slate-400 text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">Cargando...</td></tr>
              ) : restaurantes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">No hay restaurantes</td></tr>
              ) : restaurantes.map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50">
                  <td className="px-4 py-3 text-white font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{r.direccion || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{r._count?.users ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActivo(r)} className={`px-3 py-1 rounded text-xs font-medium ${r.activo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {r.activo ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEdit(r)} className="text-blue-400 hover:text-blue-300 text-sm">Editar</button>
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
            <h2 className="text-white text-xl font-bold mb-4">{editId ? "Editar" : "Nuevo"} Restaurante</h2>
            <div className="space-y-4">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del restaurante" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              {!editId && (
                <>
                  <hr className="border-slate-600" />
                  <p className="text-slate-400 text-sm">Administrador del restaurante</p>
                  <input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Nombre del admin" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                  <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="Email del admin" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                  <input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Contraseña del admin" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg">Cancelar</button>
              <button onClick={save} disabled={!form.nombre || (!editId && (!form.adminEmail || !form.adminPassword))} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
