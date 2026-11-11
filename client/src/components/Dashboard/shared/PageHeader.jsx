import { useDispatch } from "react-redux";
import { PanelLeftOpen } from "lucide-react";
import useDashboardDrawer from "../../../Hooks/useDashboardDrawer";
import { openSidebar } from "../../../redux/Slice/DashboardSlice";
import Button from "../../ui/Button";

// Title row of a dashboard page; on narrow screens it also opens the sidebar drawer
const PageHeader = ({ title, description, children }) => {
  const dispatch = useDispatch();
  const isDrawer = useDashboardDrawer();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {isDrawer && (
          <Button variant="secondary" size="icon" aria-label="Open dashboard menu" onClick={() => dispatch(openSidebar())}>
            <PanelLeftOpen aria-hidden="true" className="size-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.025em] text-ink">{title}</h1>
          {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

export default PageHeader;
