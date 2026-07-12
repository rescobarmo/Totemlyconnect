import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { Mesa } from "@/types";

const estadoColors: Record<string, string> = {
  libre: "bg-emerald-500 hover:bg-emerald-600",
  ocupada: "bg-amber-500 hover:bg-amber-600",
  cuenta_cerrada: "bg-blue-500 hover:bg-blue-600",
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
  const { user, logout } = useAuthStore();

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
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white text-lg">←</button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Mesas</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="hidden sm:inline text-slate-300">{user?.name}</span>
            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full hidden sm:inline">{user?.role}</span>
            <button onClick={logout} className="text-slate-400 hover:text-white transition">Salir</button>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs mt-2 max-w-7xl mx-auto sm:hidden">
          <span className="text-slate-300">{user?.name} · {user?.role}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Libre</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Ocupada</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Cta.</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm mt-2 max-w-7xl mx-auto">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Libre</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Ocupada</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Cta. Cerrada</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="text-center text-slate-400 py-20">Cargando mesas...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {mesas.map((mesa) => (
              <button
                key={mesa.id}
                onClick={() => handleMesaClick(mesa)}
                className={`${estadoColors[mesa.estado]} text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg transition active:scale-[0.97] hover:scale-[1.02] flex flex-col items-center justify-center min-h-[120px] sm:min-h-[140px]`}
              >
                <span className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">#{mesa.numero}</span>
                <span className="text-xs sm:text-sm font-medium opacity-90">{estadoLabels[mesa.estado]}</span>
                {mesa.pedidos?.[0] && (
                  <>
                    <span className="text-xs mt-1 sm:mt-2 opacity-70">${Number(mesa.pedidos[0].total).toLocaleString()}</span>
                    <span className="text-[10px] mt-0.5 opacity-60">{mesa.pedidos[0].user?.name}</span>
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
