import { useEffect, useState } from "react";

// Below this width the dashboard sidebar becomes a slide-in drawer
const DRAWER_QUERY = "(max-width: 1120px)";

// True while the dashboard uses the drawer layout; updates on resize
const useDashboardDrawer = () => {
  const [isDrawer, setIsDrawer] = useState(() => window.matchMedia(DRAWER_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(DRAWER_QUERY);
    const update = () => setIsDrawer(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDrawer;
};

export default useDashboardDrawer;
