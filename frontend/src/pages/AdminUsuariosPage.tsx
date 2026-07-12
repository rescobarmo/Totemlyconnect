import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsuariosPage() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get("/auth/usuarios");
      if (data.success) setUsuarios(data.data);
    } finally { setLoading(false); }
  };

  const crear = async () => {
    try {
      await api.post("/auth/usuarios", form);
      setModal(false);
      setForm({ name: "", email: "", password: "" });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al crear usuario");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold text-white">👤 Usuarios</h1>
          </div>
          <button onClick={() => setModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ Nuevo Mesero</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Nombre</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Email</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Rol</th>
                <th className="text-left px-4 py-3 text-slate-400 text-sm">Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">Cargando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No hay usuarios</td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="border-b border-slate-700/50">
                  <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded text-xs font-medium ${u.role === "superadmin" ? "bg-purple-500/20 text-purple-400" : u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white text-xl font-bold mb-4">Nuevo Mesero</h2>
            <div className="space-y-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg">Cancelar</button>
              <button onClick={crear} disabled={!form.name || !form.email || !form.password} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
