import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

function RequirePriest({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  // If not logged in, kick to login page
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If logged in but NOT a priest, kick to home page
  if (role !== "priest") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequirePriest;