import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Dashbar from "../components/Dashboard/Dashbar";
import ViewBox from "../components/Dashboard/ViewBox";
import ExportModal from "../components/Dashboard/ExportModal";
import useDashboardDrawer from "../Hooks/useDashboardDrawer";
import { closeSidebar } from "../redux/Slice/DashboardSlice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const isDrawer = useDashboardDrawer();

  // A drawer left open must not reappear later when the window is resized back down
  useEffect(() => {
    if (!isDrawer)
      dispatch(closeSidebar());
  }, [isDrawer, dispatch]);

  // min-w-0 on the main column lets wide tables scroll inside it instead of widening the page
  return (
    <div className="flex flex-1 bg-canvas">
      {isDrawer ? (
        <Dashbar />
      ) : (
        // The column stretches with the page; the panel inside stays pinned under the 56px navbar
        <aside className="w-64 shrink-0 border-r border-line bg-surface">
          <div className="sticky top-14 h-[calc(100dvh-3.5rem)]">
            <Dashbar />
          </div>
        </aside>
      )}

      <section className="min-w-0 flex-1 px-4 py-8 sm:px-8">
        <ViewBox />
      </section>
      <ExportModal />
    </div>
  );
};

export default Dashboard;
