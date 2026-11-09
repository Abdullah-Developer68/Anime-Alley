import { useNavigate } from "react-router-dom";
import useAuth from "../../Hooks/UseAuth";
import api from "../../api/api";
import { toast } from "react-toastify";

const Logout = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Revokes this device's session on the server (same for local and Google logins)
      await api.logout();
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Could not reach the server; you are logged out on this device only.");
    }
    // Always clear locally, so a server error never leaves the user logged in
    localStorage.clear();
    setUser(null);
    navigate("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="px-2 py-1 text-sm text-black bg-red-500 rounded-md cursor-pointer md:px-3 md:py-2 md:text-base"
    >
      Logout
    </button>
  );
};

export default Logout;
