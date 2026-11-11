import { Link } from "react-router-dom";
import { cx } from "./styles";

// Brand mark: a four-point star cut from a rounded square
export const LogoMark = ({ className }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className={cx("size-6", className)}>
    <rect width="32" height="32" rx="9" fill="currentColor" />
    <path d="M16 6.5c.9 4.9 4.6 8.6 9.5 9.5-4.9.9-8.6 4.6-9.5 9.5-.9-4.9-4.6-8.6-9.5-9.5 4.9-.9 8.6-4.6 9.5-9.5Z" fill="var(--color-canvas)" />
  </svg>
);

const Logo = ({ className }) => (
  <Link to="/" aria-label="Anime Alley home" className={cx("inline-flex items-center gap-2 text-ink", className)}>
    <LogoMark />
    <span className="text-[17px] font-semibold tracking-[-0.02em]">Anime Alley</span>
  </Link>
);

export default Logo;
