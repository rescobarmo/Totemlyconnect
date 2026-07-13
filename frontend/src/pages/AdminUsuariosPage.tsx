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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">👤</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Usuarios</h1>
          </div>
          <button onClick={() => setModal(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all active:scale-[0.98]">+ Nuevo Mesero</button>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-6xl px-3 sm:px-4 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Nombre</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Email</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium">Rol</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 text-xs sm:text-sm font-medium hidden sm:table-cell">Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Cargando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No hay usuarios</td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-4 py-3 text-gray-900 font-medium text-sm">{u.name}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-500 text-sm">{u.email}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                      u.role === "admin" ? "bg-amber-100 text-amber-700" :
                      "bg-indigo-100 text-indigo-700"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-400 text-xs sm:text-sm hidden sm:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
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
              <h2 className="text-lg font-bold text-gray-900">Nuevo Mesero</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Cancelar</button>
              <button onClick={crear} disabled={!form.name || !form.email || !form.password} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.98]">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
