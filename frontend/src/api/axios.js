import axios from "axios";

const api = axios.create({
  // Changed from http://localhost:5000/api to your live Render URL
  baseURL: "https://campus-cart-on6p.onrender.com/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;