import Dashbar from "../components/Dashboard/Dashbar";
import ViewBox from "../components/Dashboard/ViewBox";
import ExportModal from "../components/Dashboard/ExportModal";
import { useSelector, useDispatch } from "react-redux";
import { openSidebar } from "../redux/Slice/DashboardSlice";
import { useEffect, useState } from "react";
import assets from "../assets/asset";

const Dashboard = () => {
  const isSidebarOpen = useSelector((state) => state.dashboard.isSidebarOpen);
  const dispatch = useDispatch();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1120);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1120);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen mt-16 max-[770px]:mt-12 relative">
      {/* Sidebar for desktop, and for mobile if open */}
      {(!isMobile || isSidebarOpen) && (
        <aside
          className={`w-64 shrink-0 ${
            isMobile
              ? "fixed z-50 top-0 left-0 h-full bg-gradient-to-b from-black to-gray-900"
              : ""
          }`}
        >
          <Dashbar />
        </aside>
      )}
      {/* Main content */}
      <main
        className={"flex-grow transition-all duration-300 max-[1120px]:w-full"}
      >
        <ViewBox />
      </main>
      {/* Hamburger button for mobile */}
      {isMobile && !isSidebarOpen && (
        <button
          className="absolute top-5 z-10 p-3  ml-5 text-white rounded-full shadow-lg max-[1120px]:block min-[1121px]:hidden flex items-center justify-center"
          onClick={() => dispatch(openSidebar())}
          aria-label="Open sidebar"
        >
          {/* Modern SVG hamburger icon */}
          <img
            src={assets.dashbar}
            className="w-6 hover:scale-120 cursor-pointer"
          />
        </button>
      )}
      <ExportModal />
    </div>
  );
};

export default Dashboard;
