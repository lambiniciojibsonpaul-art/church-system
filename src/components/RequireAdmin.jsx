import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

// Wraps admin routes. Redirects to /login if no session, to / if session
// exists but the user is not an admin, otherwise renders the children.
// Renders a spinner while AuthContext is still resolving the initial session.
function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequireAdmin;
