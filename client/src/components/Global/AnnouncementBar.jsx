import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";

// Slim banner above the navbar for visitors who aren't signed in
const AnnouncementBar = () => {
  const { user } = useAuth();
  if (user)
    return null;

  return (
    <div className="px-3 pt-3">
      <Link
        to="/login"
        className="group relative mx-auto flex h-8 max-w-frame items-center justify-center rounded-lg bg-linear-to-r from-line via-sunken to-line px-8 text-[12.5px] text-ink-soft transition-colors hover:text-ink"
      >
        <span aria-hidden="true" className="absolute left-3 size-1.5 rounded-full bg-surface" />
        <span className="truncate">New here? Try every feature with a one-click demo account</span>
        <ArrowRight aria-hidden="true" className="ml-1.5 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
        <span aria-hidden="true" className="absolute right-3 size-1.5 rounded-full bg-surface" />
      </Link>
    </div>
  );
};

export default AnnouncementBar;
