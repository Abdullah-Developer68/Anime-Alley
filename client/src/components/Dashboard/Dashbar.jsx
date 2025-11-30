import { Link } from "react-router-dom";
import assets from "../../assets/asset";
import { useDispatch, useSelector } from "react-redux";
import { closeSidebar } from "../../redux/Slice/DashboardSlice";
import { motion, AnimatePresence } from "framer-motion";

const Dashbar = () => {
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector((state) => state.dashboard.isSidebarOpen);
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth <= 1120 : false;

  // Handler for navigation click
  const handleNavClick = () => {
    if (isMobile && isSidebarOpen) {
      dispatch(closeSidebar());
    }
  };

  // Animation variants for mobile sidebar
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
            className="h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 flex flex-col fixed z-50 top-0 left-0 w-64"
          >
            {/* Close button for mobile */}
            <button
              className="absolute top-4 right-4 z-50 text-3xl bg-black bg-opacity-30 rounded-full px-3 py-1 min-[1121px]:hidden"
              onClick={() => dispatch(closeSidebar())}
              aria-label="Close sidebar"
            >
              &times;
            </button>
            {/* Logo/Brand Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Anime Alley
              </h1>
              <p className="text-sm text-gray-400">Admin Dashboard</p>
            </div>
            {/* Navigation Section */}
            <nav className="flex-1">
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/dashboard/"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
                    onClick={handleNavClick}
                  >
                    <img
                      src={assets.product}
                      alt="product"
                      className="invert"
                    />
                    <span className="text-sm font-medium">Products</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/orders"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
                    onClick={handleNavClick}
                  >
                    <img src={assets.orders} alt="orders" className="invert" />
                    <span className="text-sm font-medium">Orders</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/users"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
                    onClick={handleNavClick}
                  >
                    <img src={assets.users} alt="users" className="invert" />
                    <span className="text-sm font-medium">Users</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/coupons"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
                    onClick={handleNavClick}
                  >
                    <img
                      src={assets.coupons}
                      alt="coupons"
                      className="invert"
                    />
                    <span className="text-sm font-medium">Coupons</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: no animation, normal sidebar
  return (
    <div className="h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 flex flex-col relative w-64">
      {/* Logo/Brand Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Anime Alley
        </h1>
        <p className="text-sm text-gray-400">Admin Dashboard</p>
      </div>
      {/* Navigation Section */}
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <Link
              to="/dashboard/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
              onClick={handleNavClick}
            >
              <img src={assets.product} alt="product" className="invert" />
              <span className="text-sm font-medium">Products</span>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard/orders"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
              onClick={handleNavClick}
            >
              <img src={assets.orders} alt="orders" className="invert" />
              <span className="text-sm font-medium">Orders</span>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard/users"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
              onClick={handleNavClick}
            >
              <img src={assets.users} alt="users" className="invert" />
              <span className="text-sm font-medium">Users</span>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard/coupons"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
              onClick={handleNavClick}
            >
              <img src={assets.coupons} alt="coupons" className="invert" />
              <span className="text-sm font-medium">Coupons</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Dashbar;
