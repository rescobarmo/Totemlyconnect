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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">👥</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Adm. por Restaurante</h1>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-6xl px-3 sm:px-4 pb-8 space-y-4">
        {loading ? (
          <p className="text-center py-12 text-gray-400 text-sm">Cargando...</p>
        ) : (
          restaurantes.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">🏪 {r.nombre}</h2>
                <button
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-all active:scale-[0.98]"
                >
                  + Añadir Admin
                </button>
              </div>

              {selected === r.id && (
                <div className="border-b border-gray-100 px-4 sm:px-5 py-4 bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full sm:flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full sm:flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" className="w-full sm:flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    <button onClick={crearAdmin} disabled={!form.name || !form.email || !form.password} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]">Guardar</button>
                  </div>
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs">Nombre</th>
                    <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs">Email</th>
                    <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs">Rol</th>
                    <th className="text-center px-3 sm:px-4 py-2.5 text-gray-500 text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {admins(r.id).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">Sin usuarios</td></tr>
                  ) : admins(r.id).map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-4 py-3 text-gray-900 text-sm">{u.name}</td>
                      <td className="px-3 sm:px-4 py-3 text-gray-500 text-sm">{u.email}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => cambiarRol(u, r.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 ${
                            u.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          <option value="admin">admin</option>
                          <option value="mesero">mesero</option>
                        </select>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <button onClick={() => eliminar(u, r.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
