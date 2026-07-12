import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const restId = localStorage.getItem("selectedRestaurantId");
  if (restId) {
    config.headers["x-restaurant-id"] = restId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedRestaurantId");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
