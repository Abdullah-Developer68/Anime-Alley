import { cx } from "./styles";

// Centered message for empty lists and errors, with an optional icon and action
const EmptyState = ({ icon: Icon, title, children, action, className }) => (
  <div className={cx("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
    {Icon && (
      <span className="mb-4 flex size-11 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <Icon aria-hidden="true" className="size-5" />
      </span>
    )}
    <p className="text-[15px] font-medium text-ink">{title}</p>
    {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
