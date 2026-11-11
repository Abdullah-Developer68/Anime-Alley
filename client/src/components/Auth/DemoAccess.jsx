import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Crown, Loader2, User } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";
import api from "../../api/api";
import { startUserSession } from "../../utils/userSessionManager";
import { buttonClass } from "../ui/styles";

const DEMO_ROLES = [
  { role: "user", label: "Shopper demo", icon: User },
  { role: "admin", label: "Admin demo", icon: Crown },
];

// One-click demo accounts, shared by the login and signup pages
const DemoAccess = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  const startDemo = async (role) => {
    setLoadingRole(role);
    try {
      const { data } = await api.demoLogin(role);
      startUserSession(data.user, data);
      setUser(data.user);
      toast.success(role === "admin" ? "You're in the dashboard demo. It's read-only." : "Demo account ready. Happy shopping.");
      navigate(role === "admin" ? "/dashboard" : "/shop");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't create a demo account. Please try again.");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-dashed border-line-strong bg-canvas p-4">
      <p className="text-[13px] font-medium text-ink">Just looking around?</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        Open a demo account in one click. It&apos;s deleted after 7 days, and the admin demo is read-only.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_ROLES.map(({ role, label, icon: Icon }) => (
          <button
            key={role}
            type="button"
            onClick={() => startDemo(role)}
            disabled={loadingRole !== null}
            aria-busy={loadingRole === role}
            className={buttonClass({ variant: "secondary", size: "md" })}
          >
            {loadingRole === role ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Icon aria-hidden="true" className="size-4" />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DemoAccess;
