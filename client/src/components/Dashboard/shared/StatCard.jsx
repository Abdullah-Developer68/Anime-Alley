import { m } from "motion/react";
import { cx } from "../../ui/styles";

const TONES = {
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  success: "bg-success-soft text-success",
  neutral: "bg-sunken text-ink-soft",
};

// One number with a label, for the row of totals above a table
const StatCard = ({ label, value, icon: Icon, tone = "neutral", index = 0 }) => (
  <m.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * 0.05 }}
    className="flex items-center justify-between rounded-panel border border-line bg-surface p-4"
  >
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium tracking-[-0.02em] tabular-nums text-ink">{value}</p>
    </div>
    {Icon && (
      <span className={cx("flex size-9 items-center justify-center rounded-full", TONES[tone])}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
    )}
  </m.div>
);

export default StatCard;
