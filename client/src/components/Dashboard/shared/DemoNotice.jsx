import { Eye } from "lucide-react";
import useAuth from "../../../Hooks/UseAuth";

// Shown to demo admins: the dashboard is real, but read-only and with customer details masked
const DemoNotice = () => {
  const { user } = useAuth();
  if (!user?.isDemo)
    return null;

  return (
    <div className="flex items-start gap-3 rounded-panel border border-violet/20 bg-violet-soft px-4 py-3 text-[13px] text-violet">
      <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">You&apos;re exploring a read-only demo.</span> Changes are switched off, and customers&apos; names,
        emails and addresses are masked.
      </p>
    </div>
  );
};

export default DemoNotice;
