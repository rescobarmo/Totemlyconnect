import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const cards = [
    { title: "Mesas", desc: "Gestionar mesas y pedidos", href: "/mesas", icon: "🪑", color: "from-blue-600 to-blue-700" },
    ...(isAdmin
      ? [
          { title: "Cocina", desc: "Pantalla de pedidos", href: "/cocina", icon: "🍳", color: "from-orange-600 to-orange-700" },
          { title: "Ventas", desc: "Historial de ventas", href: "/ventas", icon: "📊", color: "from-emerald-600 to-emerald-700" },
          { title: "Productos", desc: "Gestionar menú", href: "/admin/productos", icon: "🍔", color: "from-purple-600 to-purple-700" },
          { title: "Categorías", desc: "Gestionar categorías", href: "/admin/categorias", icon: "📁", color: "from-amber-600 to-amber-700" },
          { title: "Mesas Admin", desc: "Crear/editar mesas", href: "/admin/mesas", icon: "⚙️", color: "from-slate-600 to-slate-700" },
          { title: "Usuarios", desc: "Gestionar meseros", href: "/admin/usuarios", icon: "👤", color: "from-rose-600 to-rose-700" },
          ...(user?.role === "superadmin"
            ? [
                { title: "Restaurantes", desc: "Gestionar locales", href: "/admin/restaurantes", icon: "🏪", color: "from-teal-600 to-teal-700" },
                { title: "Adm. por Restaurante", desc: "Ver admins de cada local", href: "/admin/admins-por-restaurante", icon: "👥", color: "from-violet-600 to-violet-700" },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">🍽️ TotemConnect</h1>
          <div className="flex items-center gap-4">
            {user?.restaurantNombre && (
              <span className="text-emerald-400 text-sm font-medium">{user.restaurantNombre}</span>
            )}
            {user?.role === "superadmin" && (
              <span className="text-amber-400 text-sm font-medium">🌐 Global</span>
            )}
            <span className="text-slate-300">{user?.name}</span>
            <span className={`px-3 py-1 text-sm rounded-full ${user?.role === "superadmin" ? "bg-purple-700 text-purple-200" : user?.role === "admin" ? "bg-amber-700 text-amber-200" : "bg-slate-700 text-slate-300"}`}>{user?.role}</span>
            <button onClick={logout} className="text-slate-400 hover:text-white transition">Salir</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-bold mb-1">{card.title}</h3>
              <p className="text-white/70 text-sm">{card.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
