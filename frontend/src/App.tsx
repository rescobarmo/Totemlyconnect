import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import MesasPage from "@/pages/MesasPage";
import PedidoPage from "@/pages/PedidoPage";
import PagoPage from "@/pages/PagoPage";
import VentasPage from "@/pages/VentasPage";
import MantenedorCategoriasPage from "@/pages/MantenedorCategoriasPage";
import MantenedorProductosPage from "@/pages/MantenedorProductosPage";
import MantenedorMesasPage from "@/pages/MantenedorMesasPage";
import AdminUsuariosPage from "@/pages/AdminUsuariosPage";
import KitchenDisplayPage from "@/pages/KitchenDisplayPage";
import RestaurantesPage from "@/pages/admin/RestaurantesPage";
import AdminsPorRestaurantePage from "@/pages/admin/AdminsPorRestaurantePage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/mesas" element={<ProtectedRoute><MesasPage /></ProtectedRoute>} />
        <Route path="/pedido/:pedidoId" element={<ProtectedRoute><PedidoPage /></ProtectedRoute>} />
        <Route path="/pago/:pedidoId" element={<ProtectedRoute><PagoPage /></ProtectedRoute>} />
        <Route path="/ventas" element={<ProtectedRoute><VentasPage /></ProtectedRoute>} />
        <Route path="/cocina" element={<ProtectedRoute><KitchenDisplayPage /></ProtectedRoute>} />
        <Route path="/admin/categorias" element={<ProtectedRoute><MantenedorCategoriasPage /></ProtectedRoute>} />
        <Route path="/admin/productos" element={<ProtectedRoute><MantenedorProductosPage /></ProtectedRoute>} />
        <Route path="/admin/mesas" element={<ProtectedRoute><MantenedorMesasPage /></ProtectedRoute>} />
        <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuariosPage /></ProtectedRoute>} />
        <Route path="/admin/restaurantes" element={<ProtectedRoute><RestaurantesPage /></ProtectedRoute>} />
        <Route path="/admin/admins-por-restaurante" element={<ProtectedRoute><AdminsPorRestaurantePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
