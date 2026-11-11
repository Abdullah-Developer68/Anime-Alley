import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Package, ShoppingBag, Ticket, Users, X } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";
import useDashboardDrawer from "../../Hooks/useDashboardDrawer";
import { closeSidebar } from "../../redux/Slice/DashboardSlice";
import ProductSidebarFilters from "./Dashbar/ProductSidebarFilters";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { LogoMark } from "../ui/Logo";
import { cx } from "../ui/styles";

const SECTIONS = [
  { name: "Products", path: "/dashboard", icon: Package, end: true },
  { name: "Orders", path: "/dashboard/orders", icon: ShoppingBag },
  { name: "Users", path: "/dashboard/users", icon: Users },
  { name: "Coupons", path: "/dashboard/coupons", icon: Ticket },
];

const ROLE_LABELS = { superAdmin: "Super admin", admin: "Admin" };

// Sidebar content: sections, the product filters on the products page, and who is signed in
const SidebarContent = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isDrawer = useDashboardDrawer();
  const onProducts = pathname === "/dashboard" || pathname === "/dashboard/";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-4 pt-5">
        <LogoMark className="size-5" />
        <span className="text-[13px] font-medium text-ink">Dashboard</span>
      </div>

      <nav aria-label="Dashboard" className="px-2.5">
        <ul className="space-y-0.5">
          {SECTIONS.map(({ name, path, icon: Icon, end }) => (
            <li key={name}>
              <NavLink
                to={path}
                end={end}
                onClick={() => isDrawer && dispatch(closeSidebar())}
                className={({ isActive }) =>
                  cx(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                    isActive ? "bg-sunken font-medium text-ink" : "text-ink-soft hover:bg-sunken/70 hover:text-ink",
                  )
                }
              >
                <Icon aria-hidden="true" className="size-4" />
                {name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-line px-4 py-5">
        {onProducts ? (
          <ProductSidebarFilters />
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Select a row&apos;s actions to edit or remove it. Exports include every record, not just this page.
          </p>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar src={user?.profilePic} name={user?.username} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{user?.username}</p>
            {user?.isDemo ? <Badge tone="violet" className="mt-0.5 h-5 text-[11px]">Demo · read-only</Badge> : <p className="text-xs text-muted">{ROLE_LABELS[user?.role]}</p>}
          </div>
        </div>
        <Link to="/" className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-sunken hover:text-ink">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to the shop
        </Link>
      </div>
    </div>
  );
};

const Dashbar = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.dashboard.isSidebarOpen);
  const isDrawer = useDashboardDrawer();

  // Escape closes the drawer, like other dialogs
  useEffect(() => {
    if (!isDrawer || !isOpen)
      return;
    const onKey = (e) => e.key === "Escape" && dispatch(closeSidebar());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawer, isOpen, dispatch]);

  if (!isDrawer)
    return <SidebarContent />;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          <m.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dispatch(closeSidebar())} />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard menu"
            className="absolute inset-y-0 left-0 w-[min(288px,86vw)] border-r border-line bg-surface shadow-float"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <button
              type="button"
              onClick={() => dispatch(closeSidebar())}
              aria-label="Close dashboard menu"
              className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
            <SidebarContent />
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Dashbar;
