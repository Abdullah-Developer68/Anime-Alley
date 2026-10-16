import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { closeSidebar } from "../../redux/Slice/DashboardSlice";
import { Package, ShoppingBag, Users, Ticket } from "lucide-react";

const DashboardNavDock = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector((state) => state.dashboard.isSidebarOpen);
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth <= 1120 : false;

  const handleNavClick = () => {
    if (isMobile && isSidebarOpen) {
      dispatch(closeSidebar());
    }
  };

  const sections = [
    { name: "Products", path: "/dashboard/", icon: Package },
    { name: "Orders", path: "/dashboard/orders", icon: ShoppingBag },
    { name: "Users", path: "/dashboard/users", icon: Users },
    { name: "Coupons", path: "/dashboard/coupons", icon: Ticket },
  ];

  return (
    <div className="p-1.5 bg-black/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 w-fit h-fit mx-auto">
      <div className="flex items-center gap-1.5">
        {sections.map((section) => {
          const isActive =
            section.path === "/dashboard/"
              ? location.pathname === "/dashboard" ||
                location.pathname === "/dashboard/"
              : location.pathname.startsWith(section.path);
          const Icon = section.icon;

          return (
            <Link
              key={section.name}
              to={section.path}
              onClick={handleNavClick}
              className={`group relative flex items-center justify-center p-2.5 rounded-xl cursor-pointer transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(236,72,153,0.45)] border border-pink-400/50 scale-[1.04]"
                  : "bg-white/[0.05] hover:bg-white/[0.12] border border-white/5 hover:border-pink-500/30 text-white/70 hover:text-white"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? "scale-105" : "group-hover:scale-110"
                }`}
              />

              <div className="absolute z-50 invisible px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white transition-all duration-200 -translate-x-1/2 bg-zinc-900/95 border border-white/10 rounded-md shadow-xl opacity-0 bottom-full mb-2.5 left-1/2 whitespace-nowrap group-hover:opacity-100 group-hover:visible pointer-events-none backdrop-blur-md">
                {section.name.toUpperCase()}
                <div className="absolute w-2 h-2 rotate-45 -translate-x-1/2 -bottom-1 left-1/2 bg-zinc-900 border-b border-r border-white/10"></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardNavDock;
