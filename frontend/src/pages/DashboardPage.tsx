import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const cards = [
    { title: "Mesas", desc: "Gestionar mesas y pedidos", href: "/mesas", icon: "🪑" },
    ...(isAdmin
      ? [
          { title: "Cocina", desc: "Pantalla de pedidos", href: "/cocina", icon: "🍳" },
          { title: "Ventas", desc: "Historial de ventas", href: "/ventas", icon: "📊" },
          { title: "Productos", desc: "Gestionar menú", href: "/admin/productos", icon: "🍔" },
          { title: "Categorías", desc: "Gestionar categorías", href: "/admin/categorias", icon: "📁" },
          { title: "Mesas Admin", desc: "Crear/editar mesas", href: "/admin/mesas", icon: "⚙️" },
          { title: "Usuarios", desc: "Gestionar meseros", href: "/admin/usuarios", icon: "👤" },
          ...(user?.role === "superadmin"
            ? [
                { title: "Restaurantes", desc: "Gestionar locales", href: "/admin/restaurantes", icon: "🏪" },
                { title: "Adm. por Restaurante", desc: "Ver admins de cada local", href: "/admin/admins-por-restaurante", icon: "👥" },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">🍽️</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">TotemConnect</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            {user?.restaurantNombre && (
              <span className="text-emerald-600 font-medium">{user.restaurantNombre}</span>
            )}
            {user?.role === "superadmin" && (
              <span className="text-amber-600 font-medium">🌐 Global</span>
            )}
            <span className="text-gray-500">{user?.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              user?.role === "superadmin" ? "bg-purple-100 text-purple-700" :
              user?.role === "admin" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-600"
            }`}>{user?.role}</span>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600 transition-colors">Salir</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-6 max-w-7xl px-3 sm:px-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <div className="text-3xl sm:text-4xl mb-3">{card.icon}</div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5">{card.title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm">{card.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
