import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, m } from "motion/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import useAuth from "../../Hooks/UseAuth";
import useOpenCategory from "../../Hooks/useOpenCategory";
import { loadCartFromServer } from "../../redux/Thunk/cartThunks";
import { CATEGORIES } from "../../utils/catalog";
import Logo from "../ui/Logo";
import { ButtonLink } from "../ui/Button";
import { buttonClass, cx } from "../ui/styles";
import ProfileDropdown from "./ProfileDropdown";

const linkClass = (active) =>
  cx("rounded-full px-3 py-1.5 text-[13px] transition-colors", active ? "text-ink" : "text-muted hover:text-ink");

const Navbar = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const openCategory = useOpenCategory();
  const [menuOpen, setMenuOpen] = useState(false);
  const currCategory = useSelector((state) => state.shop.currCategory);
  const cartCount = useSelector((state) => state.cart.cartItems.reduce((sum, item) => sum + item.itemQuantity, 0));
  const isCartLoaded = useSelector((state) => state.cart.isCartLoaded);
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  // The cart badge needs the cart, so it loads once per visit for signed-in shoppers
  useEffect(() => {
    if (user && !isCartLoaded)
      dispatch(loadCartFromServer());
  }, [user, isCartLoaded, dispatch]);

  // Navigating closes the mobile menu
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Category links are highlighted on the shop listing only, not on a product page
  const onShop = pathname === "/shop";

  const categoryLinks = CATEGORIES.map(({ id, label }) => (
    <button key={id} type="button" onClick={() => openCategory(id)} className={linkClass(onShop && currCategory === id)}>
      {label}
    </button>
  ));

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className={cx("mx-auto flex h-14 w-full items-center gap-4 px-4 sm:px-6", pathname.startsWith("/dashboard") ? "max-w-none" : "max-w-frame")}>
        <Logo />

        <nav aria-label="Main" className="ml-4 hidden items-center lg:flex">
          <NavLink to="/shop" end className={({ isActive }) => linkClass(isActive)}>
            Shop
          </NavLink>
          {categoryLinks}
          {isAdmin && (
            <NavLink to="/dashboard" className={({ isActive }) => linkClass(isActive)}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {user ? (
            <>
              <Link to="/cart" aria-label={`Cart, ${cartCount} items`} className={buttonClass({ variant: "ghost", size: "icon", className: "relative" })}>
                <ShoppingBag aria-hidden="true" className="size-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium tabular-nums text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              <ProfileDropdown />
            </>
          ) : (
            <>
              <ButtonLink to="/login" variant="secondary" size="sm" className="max-sm:hidden">
                Log in
              </ButtonLink>
              <ButtonLink to="/signup" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={buttonClass({ variant: "ghost", size: "icon", className: "lg:hidden" })}
          >
            {menuOpen ? <X aria-hidden="true" className="size-[18px]" /> : <Menu aria-hidden="true" className="size-[18px]" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <m.nav
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full border-b border-line bg-canvas px-4 pb-5 pt-2 shadow-float lg:hidden"
          >
            <div className="flex flex-col items-start">
              <NavLink to="/shop" end className={({ isActive }) => linkClass(isActive)}>
                Shop all
              </NavLink>
              {categoryLinks}
              {isAdmin && (
                <NavLink to="/dashboard" className={({ isActive }) => linkClass(isActive)}>
                  Dashboard
                </NavLink>
              )}
            </div>
            {!user && (
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <ButtonLink to="/login" variant="secondary" size="sm" className="flex-1">
                  Log in
                </ButtonLink>
                <ButtonLink to="/signup" size="sm" className="flex-1">
                  Get started
                </ButtonLink>
              </div>
            )}
          </m.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
