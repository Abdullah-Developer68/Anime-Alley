import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import useOpenCategory from "../../Hooks/useOpenCategory";
import { CATEGORIES } from "../../utils/catalog";
import Logo from "../ui/Logo";

const footerLink = "text-[13px] text-muted transition-colors hover:text-ink";

const Footer = () => {
  const openCategory = useOpenCategory();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-frame gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(3,1fr)] md:border-x md:border-line">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
            Comics, figures, apparel and sneakers from the series you love.
          </p>
        </div>

        <div>
          <p className="text-[13px] font-medium text-ink">Shop</p>
          <ul className="mt-3 space-y-2">
            {CATEGORIES.map(({ id, label }) => (
              <li key={id}>
                <button type="button" onClick={() => openCategory(id)} className={footerLink}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-medium text-ink">Account</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/login" className={footerLink}>Log in</Link></li>
            <li><Link to="/signup" className={footerLink}>Create an account</Link></li>
            <li><Link to="/cart" className={footerLink}>Cart</Link></li>
            <li><Link to="/history" className={footerLink}>Order history</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-medium text-ink">Store</p>
          <ul className="mt-3 space-y-2 text-[13px] text-muted">
            <li>Flat $5 shipping</li>
            <li>Card or cash on delivery</li>
            <li>
              <a href="https://github.com/Abdullah-Developer68/Anime-Alley" target="_blank" rel="noreferrer" className={`${footerLink} inline-flex items-center gap-1`}>
                Source code
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-frame flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-5 text-xs text-subtle md:border-x">
        <p>© {new Date().getFullYear()} Anime Alley</p>
        <p>Prices in USD</p>
      </div>
    </footer>
  );
};

export default Footer;
