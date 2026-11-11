// Class recipes for the design system. Components in this folder use them, and so can any element
// that needs to look like a button or input without being one (e.g. a <Link> styled as a button).

export const cx = (...parts) => parts.filter(Boolean).join(" ");

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-45";

const BUTTON_VARIANTS = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-sunken",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger/90",
  "danger-ghost": "text-danger hover:bg-danger-soft",
};

const BUTTON_SIZES = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-[15px]",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export const buttonClass = ({ variant = "primary", size = "md", className = "" } = {}) =>
  cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-subtle transition-[border-color,box-shadow] hover:border-line-strong focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

// "!" makes these win over the input recipe they extend
export const textareaClass = cx(inputClass, "h-auto! min-h-24 py-2.5! leading-relaxed");

export const labelClass = "mb-1.5 block text-[13px] font-medium text-ink-soft";

export const panelClass = "rounded-panel border border-line bg-surface";

// Small uppercase label above a section title, e.g. "SHOP BY CATEGORY"
export const eyebrowClass = "text-xs font-medium uppercase tracking-[0.14em] text-muted";

export const BADGE_TONES = {
  neutral: "bg-sunken text-ink-soft",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  ink: "bg-ink text-white",
};

// Order status -> badge tone, used wherever an order appears
export const ORDER_STATUS_TONES = {
  pending: "warning",
  processing: "info",
  shipped: "violet",
  delivered: "success",
};
