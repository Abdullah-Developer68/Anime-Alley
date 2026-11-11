import { BADGE_TONES, cx } from "./styles";

const Badge = ({ tone = "neutral", className, children }) => (
  <span className={cx("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium capitalize", BADGE_TONES[tone], className)}>
    {children}
  </span>
);

export default Badge;
