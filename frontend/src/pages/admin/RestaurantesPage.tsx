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

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function RestaurantesPage() {
  const navigate = useNavigate();
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading] = useState(true);
  const [restModal, setRestModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", telefono: "", adminName: "", adminEmail: "", adminPassword: "" });

  const [userModal, setUserModal] = useState<Restaurante | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "mesero" });

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
    setRestModal(true);
  };

  const openEdit = (r: Restaurante) => {
    setEditId(r.id);
    setForm({ nombre: r.nombre, direccion: r.direccion || "", telefono: r.telefono || "", adminName: "", adminEmail: "", adminPassword: "" });
    setRestModal(true);
  };

  const saveRest = async () => {
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
      setRestModal(false);
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

  const openUsuarios = async (r: Restaurante) => {
    setUserModal(r);
    setUserForm({ name: "", email: "", password: "", role: "mesero" });
    try {
      const { data } = await api.get(`/auth/usuarios?restaurantId=${r.id}`);
      if (data.success) setUsuarios(data.data);
    } catch { setUsuarios([]); }
  };

  const crearUsuario = async () => {
    try {
      await api.post("/auth/usuarios", { ...userForm, restaurantId: userModal!.id });
      setUserForm({ name: "", email: "", password: "", role: "mesero" });
      const { data } = await api.get(`/auth/usuarios?restaurantId=${userModal!.id}`);
      if (data.success) setUsuarios(data.data);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al crear usuario");
    }
  };

  const eliminarUsuario = async (u: Usuario) => {
    if (!confirm(`¿Eliminar usuario ${u.name}?`)) return;
    try {
      await api.delete(`/auth/usuarios/${u.id}`);
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al eliminar");
    }
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
            <span className="text-lg sm:text-xl">🏪</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Restaurantes</h1>
          </div>
          <button onClick={openCreate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98]">+ Nuevo</button>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-6xl px-3 sm:px-4 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Nombre</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium hidden sm:table-cell">Dirección</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Usuarios</th>
                <th className="text-center px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Activo</th>
                <th className="text-center px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Cargando...</td></tr>
              ) : restaurantes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No hay restaurantes</td></tr>
              ) : restaurantes.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-4 py-3 text-gray-900 font-medium text-sm">{r.nombre}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-500 text-sm hidden sm:table-cell">{r.direccion || "—"}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <button onClick={() => openUsuarios(r)} className="text-indigo-600 hover:text-indigo-700 underline text-sm">
                      {r._count?.users ?? 0} usuarios
                    </button>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <button onClick={() => toggleActivo(r)} className={`px-3 py-1 rounded text-xs font-medium ${
                      r.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>{r.activo ? "Sí" : "No"}</button>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <button onClick={() => openEdit(r)} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {restModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setRestModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl sm:mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Editar" : "Nuevo"} Restaurante</h2>
              <button onClick={() => setRestModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del restaurante" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              {!editId && (
                <>
                  <hr className="border-gray-200" />
                  <p className="text-gray-500 text-sm font-medium">Administrador del restaurante</p>
                  <input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Nombre del admin" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="Email del admin" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Contraseña del admin" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </>
              )}
            </div>
            <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setRestModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Cancelar</button>
              <button onClick={saveRest} disabled={!form.nombre || (!editId && (!form.adminEmail || !form.adminPassword))} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {userModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setUserModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-xl sm:mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Usuarios — {userModal.nombre}</h2>
              <button onClick={() => setUserModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="px-4 py-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h3 className="text-gray-700 text-sm font-medium mb-3">Nuevo usuario</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Nombre" className="sm:col-span-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="Email" className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Contraseña" className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="mesero">Mesero</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={crearUsuario} disabled={!userForm.name || !userForm.email || !userForm.password} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]">Crear</button>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-gray-500 text-xs">Nombre</th>
                    <th className="text-left px-3 py-2 text-gray-500 text-xs">Email</th>
                    <th className="text-left px-3 py-2 text-gray-500 text-xs">Rol</th>
                    <th className="text-center px-3 py-2 text-gray-500 text-xs">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">Sin usuarios</td></tr>
                  ) : usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="px-3 py-2.5 text-gray-900 text-sm">{u.name}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-sm">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          u.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                          u.role === "admin" ? "bg-amber-100 text-amber-700" :
                          "bg-indigo-100 text-indigo-700"
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {u.role !== "superadmin" && (
                          <button onClick={() => eliminarUsuario(u)} className="text-red-500 hover:text-red-600 text-xs font-medium">Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
