import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { AnimatePresence, m } from "motion/react";
import { History, LayoutDashboard, LogOut } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";
import useLogout from "../../Hooks/useLogout";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";

const itemClass = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-sunken hover:text-ink";

// Avatar button with the account menu
const ProfileDropdown = () => {
  const { user } = useAuth();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const updatedProfilePic = useSelector((state) => state.dashboard.updatedProfilePic);
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  // Clicks outside the menu and Escape close it
  useEffect(() => {
    if (!open)
      return;
    const onPointer = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-sunken"
      >
        <Avatar src={updatedProfilePic || user?.profilePic} name={user?.username} className="size-7" />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-float"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-3 pt-2">
              <Avatar src={updatedProfilePic || user?.profilePic} name={user?.username} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{user?.username}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
            </div>
            {user?.isDemo && (
              <div className="px-2.5 pt-2.5">
                <Badge tone="violet">Demo account</Badge>
              </div>
            )}
            <div className="mt-1.5 flex flex-col">
              <Link to="/history" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <History aria-hidden="true" className="size-4" />
                Order history
              </Link>
              {isAdmin && (
                <Link to="/dashboard" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                  <LayoutDashboard aria-hidden="true" className="size-4" />
                  Dashboard
                </Link>
              )}
              <button type="button" role="menuitem" onClick={logout} className={`${itemClass} hover:text-danger`}>
                <LogOut aria-hidden="true" className="size-4" />
                Log out
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
