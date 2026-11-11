import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../Hooks/UseAuth";
import { PageSpinner } from "./ui/Spinner";

// Pages for signed-in people; /dashboard is for admins only. The server enforces the same rules,
// this only keeps people from landing on pages that would refuse them.
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return <PageSpinner />;
  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />;
  if (location.pathname.startsWith("/dashboard") && !["admin", "superAdmin"].includes(user.role))
    return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
