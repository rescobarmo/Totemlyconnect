import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface Restaurante {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminsPorRestaurantePage() {
  const navigate = useNavigate();
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [usuariosPorRest, setUsuariosPorRest] = useState<Record<number, Usuario[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data: rData } = await api.get("/restaurantes");
      if (!rData.success) return;
      setRestaurantes(rData.data);

      const map: Record<number, Usuario[]> = {};
      for (const r of rData.data) {
        const { data: uData } = await api.get(`/auth/usuarios?restaurantId=${r.id}`);
        if (uData.success) map[r.id] = uData.data;
        else map[r.id] = [];
      }
      setUsuariosPorRest(map);
    } finally { setLoading(false); }
  };

  const crearAdmin = async () => {
    if (!selected) return;
    try {
      await api.post("/auth/usuarios", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: "admin",
        restaurantId: selected,
      });
      setForm({ name: "", email: "", password: "" });
      const { data } = await api.get(`/auth/usuarios?restaurantId=${selected}`);
      if (data.success) setUsuariosPorRest((prev) => ({ ...prev, [selected]: data.data }));
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al crear admin");
    }
  };

  const eliminar = async (u: Usuario, restId: number) => {
    if (!confirm(`¿Eliminar admin ${u.name}?`)) return;
    try {
      await api.delete(`/auth/usuarios/${u.id}`);
      setUsuariosPorRest((prev) => ({
        ...prev,
        [restId]: prev[restId].filter((x) => x.id !== u.id),
      }));
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al eliminar");
    }
  };

  const cambiarRol = async (u: Usuario, restId: number, nuevoRol: string) => {
    try {
      await api.patch(`/auth/usuarios/${u.id}/role`, { role: nuevoRol });
      setUsuariosPorRest((prev) => ({
        ...prev,
        [restId]: prev[restId].map((x) => (x.id === u.id ? { ...x, role: nuevoRol } : x)),
      }));
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al cambiar rol");
    }
  };

  const admins = (restId: number) => (usuariosPorRest[restId] || []).filter((u) => u.role !== "superadmin");

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold text-white">👥 Adm. por Restaurante</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {loading ? (
          <p className="text-slate-500 text-center py-12">Cargando...</p>
        ) : (
          restaurantes.map((r) => (
            <div key={r.id} className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 bg-slate-750 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">🏪 {r.nombre}</h2>
                <button
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                >
                  + Añadir Admin
                </button>
              </div>

              {selected === r.id && (
                <div className="bg-slate-750 border-b border-slate-700 px-5 py-4">
                  <div className="flex gap-3 items-end">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    <button onClick={crearAdmin} disabled={!form.name || !form.email || !form.password} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm font-medium rounded-lg whitespace-nowrap">Guardar</button>
                  </div>
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 text-xs">Nombre</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-xs">Email</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-xs">Rol</th>
                    <th className="text-center px-4 py-3 text-slate-400 text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {admins(r.id).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-slate-500 text-sm">Sin usuarios</td></tr>
                  ) : admins(r.id).map((u) => (
                    <tr key={u.id} className="border-b border-slate-700/50">
                      <td className="px-4 py-3 text-white text-sm">{u.name}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => cambiarRol(u, r.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 ${u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}
                        >
                          <option value="admin">admin</option>
                          <option value="mesero">mesero</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => eliminar(u, r.id)} className="text-red-400 hover:text-red-300 text-xs">Eliminar</button>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
