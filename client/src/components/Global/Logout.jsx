import { useNavigate } from "react-router-dom";
import useAuth from "../../Hooks/UseAuth";
import api from "../../api/api";
import { toast } from "react-toastify";

const Logout = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (user.googleId) {
        // Google OAuth logout
        api.googleLogout();
        localStorage.clear(); // Clear all local storage data, but after the server deletes the cookie because of domain issue on vercel cookies can not be shared in monorepo so i am using localStorage to handle tokens if this is cleard before the token is sent to the server before logout then the token will remain on the client side and the server wont expire it
      } else {
        // Regular auth logout
        await api.logout();
        localStorage.clear(); // Clear all local storage data
        setUser(null); // Clear user state for making routes protected again
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-black bg-red-500 px-2 py-1 md:px-3 md:py-2 rounded-md cursor-pointer text-sm md:text-base"
    >
      Logout
    </button>
  );
};

export default Logout;
