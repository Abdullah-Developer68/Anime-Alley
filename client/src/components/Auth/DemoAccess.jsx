import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Crown, Loader2, Sparkles, User } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";
import api from "../../api/api";
import { checkAndHandleUserChange, saveAuthTokens } from "../../utils/userSessionManager";

const DEMO_ROLES = [
  {
    role: "admin",
    label: "Demo Admin",
    icon: Crown,
    className: "border-yellow-400/30 bg-yellow-500/15 text-yellow-100 hover:border-yellow-400/50 hover:bg-yellow-500/25",
  },
  {
    role: "user",
    label: "Demo User",
    icon: User,
    className: "border-pink-400/30 bg-pink-500/15 text-pink-100 hover:border-pink-400/50 hover:bg-pink-500/25",
  },
];

// One-click demo accounts, shared by the login and signup pages
const DemoAccess = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  const startDemo = async (role) => {
    setLoadingRole(role);
    try {
      const res = await api.demoLogin(role);
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to create demo account");
        return;
      }

      // Only clear if the user didn't change, to avoid clearing twice
      if (!checkAndHandleUserChange(res.data.user))
        localStorage.clear();
      // Access token for the Authorization header, refresh token to renew it
      saveAuthTokens(res.data);

      setUser(res.data.user);
      localStorage.setItem("userInfo", JSON.stringify(res.data.user));
      toast.success(`Logged in as ${res.data.user.username} (${res.data.user.role})!`);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create demo account. Please try again.");
      console.error("Demo login error:", error);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-dashed border-yellow-400/30 bg-yellow-500/[0.06] p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-yellow-200">
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        Just exploring?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Try a demo account in one click. It&apos;s deleted automatically after 7 days.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_ROLES.map(({ role, label, icon: Icon, className }) => (
          <button
            key={role}
            type="button"
            onClick={() => startDemo(role)}
            disabled={loadingRole !== null}
            aria-busy={loadingRole === role}
            className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
          >
            {loadingRole === role ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Icon aria-hidden="true" className="h-4 w-4" />
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DemoAccess;
