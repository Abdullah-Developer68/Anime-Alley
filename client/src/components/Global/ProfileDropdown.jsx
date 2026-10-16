import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";
import api from "../../api/api";
import { toast } from "react-toastify";

const ProfileDropdown = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (onClose) onClose();
      if (user?.googleId) {
        api.googleLogout();
        localStorage.clear();
      } else {
        await api.logout();
        localStorage.clear();
        setUser(null);
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0b0f19] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* User Information Header */}
      <div className="px-3 py-2 mb-1 border-b border-white/10">
        <p className="text-sm font-semibold text-white truncate">
          {user?.username || "User"}
        </p>
        <p className="text-xs truncate text-white/50">{user?.email}</p>
      </div>

      {/* Logout Action */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );
};

export default ProfileDropdown;
