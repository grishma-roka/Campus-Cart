import { Navigate } from "react-router-dom";
import BuyerDashboard from "./BuyerDashboard";
import SellerDashboard from "./SellerDashboard";
import RiderDashboard from "./RiderDashboard";
import AdminDashboard from "./AdminDashboard";

function Dashboard() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" />;

  if (role === "admin") return <AdminDashboard />;
  if (role === "seller") return <SellerDashboard />;
  if (role === "rider") return <RiderDashboard />;
  if (role === "buyer") return <BuyerDashboard />;

  return <Navigate to="/login" />;
}

export default Dashboard;
