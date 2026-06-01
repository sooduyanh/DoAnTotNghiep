import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login        from "./Login";
import CustomerHome from "./pages/CustomerHome";
import StaffDashboard from "./pages/StaffDashboard";
import AdminPanel   from "./pages/AdminPanel";

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#5a4723",fontSize:14}}>Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "staff"  && !["staff","admin"].includes(user.role)) return <Navigate to="/home" replace />;
  if (role === "admin"  && user.role !== "admin") return <Navigate to="/home" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"       element={<RootRedirect />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/home"   element={<RequireRole role="customer"><CustomerHome /></RequireRole>} />
        <Route path="/staff"  element={<RequireRole role="staff"><StaffDashboard /></RequireRole>} />
        <Route path="/admin"  element={<RequireRole role="admin"><AdminPanel /></RequireRole>} />
        <Route path="*"       element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
