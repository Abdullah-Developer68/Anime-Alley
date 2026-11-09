import { useNavigate } from "react-router-dom";
import useAuth from "../../Hooks/UseAuth";
import api from "../../api/api";
import { toast } from "react-toastify";

const Logout = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Same for local and Google logins: the session is the token stored in localStorage
      await api.logout();
      localStorage.clear(); // Clear all local storage data
      setUser(null); // Clear user state for making routes protected again
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout. Please try again.");
    }
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
