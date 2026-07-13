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
                  <td className="px-4 py-3 text-slate-300">
                    <button onClick={() => openUsuarios(r)} className="text-blue-400 hover:text-blue-300 underline text-sm">
                      {r._count?.users ?? 0} usuarios
                    </button>
                  </td>
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

      {restModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRestModal(false)}>
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
              <button onClick={() => setRestModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg">Cancelar</button>
              <button onClick={saveRest} disabled={!form.nombre || (!editId && (!form.adminEmail || !form.adminPassword))} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {userModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setUserModal(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-bold">Usuarios — {userModal.nombre}</h2>
              <button onClick={() => setUserModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-750 border border-slate-600 rounded-lg p-4 mb-6">
              <h3 className="text-slate-300 text-sm font-medium mb-3">Nuevo usuario</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Nombre" className="col-span-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="Email" className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Contraseña" className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                  <option value="mesero">Mesero</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={crearUsuario} disabled={!userForm.name || !userForm.email || !userForm.password} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg">Crear</button>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-400 text-xs">Nombre</th>
                  <th className="text-left px-3 py-2 text-slate-400 text-xs">Email</th>
                  <th className="text-left px-3 py-2 text-slate-400 text-xs">Rol</th>
                  <th className="text-center px-3 py-2 text-slate-400 text-xs">Acción</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-500 text-sm">Sin usuarios</td></tr>
                ) : usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-slate-700/50">
                    <td className="px-3 py-2 text-white text-sm">{u.name}</td>
                    <td className="px-3 py-2 text-slate-300 text-sm">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === "superadmin" ? "bg-purple-500/20 text-purple-400" : u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {u.role !== "superadmin" && (
                        <button onClick={() => eliminarUsuario(u)} className="text-red-400 hover:text-red-300 text-xs">Eliminar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
