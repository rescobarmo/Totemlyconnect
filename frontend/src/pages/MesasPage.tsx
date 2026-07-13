import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { Mesa } from "@/types";

const estadoColors: Record<string, string> = {
  libre: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200",
  ocupada: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
  cuenta_cerrada: "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200",
};

const estadoLabels: Record<string, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  cuenta_cerrada: "Cuenta Cerrada",
};

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchMesas();
  }, []);

  useEffect(() => {
    socket.on("mesa:estado", () => fetchMesas());
    socket.on("pedido:creado", () => fetchMesas());
    socket.on("pedido:cerrado", () => fetchMesas());
    return () => {
      socket.off("mesa:estado");
      socket.off("pedido:creado");
      socket.off("pedido:cerrado");
    };
  }, [socket]);

  const fetchMesas = async () => {
    try {
      const { data } = await api.get("/mesas");
      if (data.success) setMesas(data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleMesaClick = async (mesa: Mesa) => {
    if (mesa.estado === "libre") {
      try {
        const { data } = await api.post("/pedidos/iniciar", { mesa_id: mesa.id });
        if (data.success) {
          navigate(`/pedido/${data.data.id}`);
        }
      } catch (err: any) {
        alert(err.response?.data?.error || "Error al iniciar pedido");
      }
    } else if (mesa.pedidos?.[0]) {
      if (user?.role !== "admin" && mesa.pedidos[0].userId !== user?.id) {
        alert("Esta mesa está siendo atendida por otro mesero");
        return;
      }
      navigate(`/pedido/${mesa.pedidos[0].id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg sm:text-xl">🪑</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Mesas</h1>
          </div>
          <span className="text-xs sm:text-sm text-gray-500">{user?.name}</span>
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-4 px-3 sm:px-4 pb-2.5 sm:pb-3 text-xs sm:text-sm text-gray-500">
          <span className="flex items-center gap-1 sm:gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
            Libre
          </span>
          <span className="flex items-center gap-1 sm:gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500" />
            Ocupada
          </span>
          <span className="flex items-center gap-1 sm:gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
            Cta. Cerrada
          </span>
        </div>
      </nav>

      <main className="mx-auto mt-4 sm:mt-6 max-w-7xl px-3 sm:px-4 pb-8">
        {loading ? (
          <div className="text-center text-gray-400 py-20">Cargando mesas...</div>
        ) : mesas.length === 0 ? (
          <div className="text-center text-gray-400 py-20">No hay mesas registradas</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {mesas.map((mesa) => (
              <button
                key={mesa.id}
                onClick={() => handleMesaClick(mesa)}
                className={`${estadoColors[mesa.estado]} rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all active:scale-[0.97] hover:scale-[1.02] hover:-translate-y-0.5 flex flex-col items-center justify-center min-h-[110px] sm:min-h-[130px]`}
              >
                <span className="text-2xl sm:text-3xl font-bold mb-0.5 sm:mb-1">#{mesa.numero}</span>
                <span className="text-xs sm:text-sm font-medium opacity-90">{estadoLabels[mesa.estado]}</span>
                {mesa.pedidos?.[0] && (
                  <>
                    <span className="text-xs mt-1 sm:mt-1.5 opacity-80">${Number(mesa.pedidos[0].total).toLocaleString()}</span>
                    <span className="text-[10px] sm:text-xs mt-0.5 opacity-60">{mesa.pedidos[0].user?.name}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
