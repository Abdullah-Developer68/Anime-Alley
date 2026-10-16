import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { closeSidebar } from "../../redux/Slice/DashboardSlice";
import { motion, AnimatePresence } from "framer-motion";
import DashboardNavDock from "./DashboardNavDock";
import ProductSidebarFilters from "./Dashbar/ProductSidebarFilters";

const Dashbar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isSidebarOpen = useSelector((state) => state.dashboard.isSidebarOpen);
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth <= 1120 : false;

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
          <motion.div
            key="dashbar-mobile"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sidebarVariants}
            className="fixed top-0 left-0 z-50 flex flex-col w-[280px] h-screen p-5 overflow-y-auto text-white bg-zinc-950 border-r border-white/10 shadow-2xl scrollbar-thin scrollbar-thumb-white/10"
          >
            <button
              className="absolute z-50 px-3 py-1 text-2xl text-white bg-black rounded-full top-3 right-3 bg-opacity-40 min-[1121px]:hidden"
              onClick={() => dispatch(closeSidebar())}
              aria-label="Close sidebar"
            >
              &times;
            </button>
            {navContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: normal fixed-width sidebar matching shop FilterBar dimensions
  return (
    <div className="relative flex flex-col w-[280px] h-[calc(100vh-4rem)] p-5 text-white bg-zinc-950 border-r border-white/10 shadow-2xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      {navContent}
    </div>
  );
};

export default Dashbar;
