import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { PanelLeftOpen } from "lucide-react";
import Dashbar from "../components/Dashboard/Dashbar";
import ViewBox from "../components/Dashboard/ViewBox";
import ExportModal from "../components/Dashboard/ExportModal";
import useDashboardDrawer from "../Hooks/useDashboardDrawer";
import { closeSidebar, openSidebar } from "../redux/Slice/DashboardSlice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const isDrawer = useDashboardDrawer();

  // A drawer left open must not reappear later when the window is resized back down
  useEffect(() => {
    if (!isDrawer)
      dispatch(closeSidebar());
  }, [isDrawer, dispatch]);

  return (
    // The navbar is fixed: 52px tall below md, 64px from md up
    <div className="relative mt-[52px] flex min-h-[calc(100vh-52px)] bg-black md:mt-16 md:min-h-[calc(100vh-4rem)]">
      {isDrawer ? (
        <Dashbar />
      ) : (
        // The column stretches with the page; the panel inside stays pinned under the navbar
        <aside className="w-[280px] shrink-0 border-r border-white/10 bg-zinc-950">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <Dashbar />
          </div>
        </aside>
      )}

      {/* min-w-0 lets wide tables scroll inside the page instead of widening it */}
      <main className="min-w-0 flex-1">
        <ViewBox />
      </main>

      {isDrawer && (
        <button
          type="button"
          onClick={() => dispatch(openSidebar())}
          aria-label="Open dashboard menu"
          className="absolute left-6 top-6 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-pink-500/40 hover:bg-white/10"
        >
          <PanelLeftOpen aria-hidden="true" className="h-5 w-5" />
        </button>
      )}
      <ExportModal />
    </div>
  );
};

export default Dashboard;
