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
    <div className="relative flex min-h-screen mt-16 max-[770px]:mt-12">
      {/* Sidebar for desktop, and for mobile if open */}
      {(!isMobile || isSidebarOpen) && (
        <aside
          className={`w-[280px] shrink-0 ${
            isMobile
              ? "fixed z-50 top-0 left-0 h-full bg-zinc-950"
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
          className="absolute z-10 flex items-center justify-center p-3 ml-5 text-white rounded-full shadow-lg top-5 max-[1120px]:block min-[1121px]:hidden"
          onClick={() => dispatch(openSidebar())}
          aria-label="Open sidebar"
        >
          {/* Modern SVG hamburger icon */}
          <img
            src={assets.dashbar}
            className="w-6 cursor-pointer hover:scale-120"
          />
        </button>
      )}
      <ExportModal />
    </div>
  );
};

export default Dashboard;
