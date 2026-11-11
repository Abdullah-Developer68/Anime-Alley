import PropTypes from "prop-types";

// Title row shared by every dashboard page; the left padding clears the drawer toggle on narrow screens
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 max-[1120px]:pl-14">
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

PageHeader.propTypes = { title: PropTypes.string.isRequired, subtitle: PropTypes.node, children: PropTypes.node };

const BUTTON_VARIANTS = {
  neutral: "border border-white/10 bg-white/[0.04] text-ink-100 hover:bg-white/[0.08]",
  primary: "bg-pink-500 text-ink-950 hover:bg-pink-400",
};

// Icon plus a label that collapses to the icon alone on small screens
export const ToolbarButton = ({ icon: Icon, label, variant = "neutral", spin = false, ...props }) => (
  <button
    type="button"
    title={label}
    className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]}`}
    {...props}
  >
    <Icon aria-hidden="true" className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} />
    <span className="max-sm:sr-only">{label}</span>
  </button>
);

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(Object.keys(BUTTON_VARIANTS)),
  spin: PropTypes.bool,
};

export const StatCard = ({ label, value, icon }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-ink-900/60 p-4">
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
    </div>
    {icon && (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
        <img src={icon} alt="" className="h-5 w-5 opacity-80" />
      </div>
    )}
  </div>
);

StatCard.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node, icon: PropTypes.string };
