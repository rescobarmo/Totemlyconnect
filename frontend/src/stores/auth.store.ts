import { create } from "zustand";
import { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedRestaurantId: number | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setSelectedRestaurantId: (id: number | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  selectedRestaurantId: (() => {
    const v = localStorage.getItem("selectedRestaurantId");
    return v ? Number(v) : null;
  })(),

  login: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true, selectedRestaurantId: user.restaurantId ?? null });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRestaurantId");
    set({ user: null, token: null, isAuthenticated: false, selectedRestaurantId: null });
  },

  setSelectedRestaurantId: (id) => {
    if (id) localStorage.setItem("selectedRestaurantId", String(id));
    else localStorage.removeItem("selectedRestaurantId");
    set({ selectedRestaurantId: id });
  },
}));
