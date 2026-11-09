import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { closeSidebar } from "../../redux/Slice/DashboardSlice";
import { motion, AnimatePresence } from "framer-motion";
import DashboardNavDock from "./DashboardNavDock";
import ProductSidebarFilters from "./Dashbar/ProductSidebarFilters";
import { X } from "lucide-react";
import useDashboardDrawer from "../../Hooks/useDashboardDrawer";

const Dashbar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isSidebarOpen = useSelector((state) => state.dashboard.isSidebarOpen);
  const isMobile = useDashboardDrawer();

  // Escape closes the drawer, like other dialogs
  useEffect(() => {
    if (!isMobile || !isSidebarOpen)
      return;
    const onKey = (e) => e.key === "Escape" && dispatch(closeSidebar());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, isSidebarOpen, dispatch]);

  const isProducts =
    location.pathname === "/dashboard" || location.pathname === "/dashboard/";
  const isOrders = location.pathname.startsWith("/dashboard/orders");
  const isUsers = location.pathname.startsWith("/dashboard/users");
  const isCoupons = location.pathname.startsWith("/dashboard/coupons");

  // Animation variants for mobile sidebar drawer
  const sidebarVariants = {
    hidden: { x: "-100%" },
    visible: {
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    exit: {
      x: "-100%",
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  const navContent = (
    <div className="flex flex-col h-full space-y-5">
      <div className="text-center shrink-0">
        <h2 className="text-lg font-bold tracking-wide text-white">
          Dashboard
        </h2>
      </div>

      <div className="shrink-0 flex justify-center">
        <DashboardNavDock />
      </div>

      <div className="w-full h-px shrink-0 bg-white/10" />

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {isProducts && <ProductSidebarFilters />}

        {isOrders && (
          <div className="space-y-3 text-center pt-4">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
              Orders Management
            </h3>
            <p className="text-xs text-gray-500">
              Manage and track customer order status, invoices, and fulfillment.
            </p>
          </div>
        )}

        {isUsers && (
          <div className="space-y-3 text-center pt-4">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
              Users Management
            </h3>
            <p className="text-xs text-gray-500">
              View customer profiles, roles, permissions, and accounts.
            </p>
          </div>
        )}

        {isCoupons && (
          <div className="space-y-3 text-center pt-4">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
              Coupons Management
            </h3>
            <p className="text-xs text-gray-500">
              Create and manage promotional discounts and coupon codes.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop: dims the page and closes the drawer when tapped */}
            <motion.div
              key="dashbar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(closeSidebar())}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="dashbar-mobile"
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard menu"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sidebarVariants}
              className="fixed left-0 top-0 z-[70] flex h-dvh w-[min(300px,85vw)] flex-col overflow-y-auto border-r border-white/10 bg-zinc-950 p-5 text-white shadow-2xl scrollbar-thin scrollbar-thumb-white/10"
            >
              <button
                type="button"
                className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                onClick={() => dispatch(closeSidebar())}
                aria-label="Close dashboard menu"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
              {navContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: fills the sticky column set up in pages/Dashboard.jsx
  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 text-white scrollbar-thin scrollbar-thumb-white/10">
      {navContent}
    </div>
  );
};

export default Dashbar;
