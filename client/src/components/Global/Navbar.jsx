import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import assets from "../../assets/asset";
import useAuth from "../../Hooks/UseAuth";
import ProfileDropdown from "./ProfileDropdown";

const Navbar = () => {
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const updatedProfilePic = useSelector(
    (state) => state.dashboard.updatedProfilePic,
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  return (
    <>
      <nav className="w-full fixed top-0 h-[52px] md:h-[64px] bg-gradient-to-r bg-[#0F172A] flex justify-between items-center px-3 py-1.5 md:px-4 md:py-2 shadow-lg shadow-indigo-500/10 z-50">
        <span className="flex items-center gap-2 md:gap-3">
          {/* Logo */}
          <img
            src={assets.logo}
            className="w-10 h-10 rounded-full shadow-lg md:w-12 md:h-12 ring-1 ring-black"
            alt="Logo"
          />
        </span>

        {/* Navigation & Auth */}
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/">
            <img src={assets.homeIcon} alt="home" />
          </Link>
          <Link to="/shop">
            <img src={assets.shop} alt="shop" />
          </Link>
          <Link to="/cart">
            <img src={assets.cart} alt="cart" />
          </Link>
          <Link to="/history">
            <img src={assets.history} alt="history" />
          </Link>
          {user && (user.role === "superAdmin" || user.role === "admin") && (
            <Link to="/dashboard">
              <img src={assets.settings} alt="dashboard" />
            </Link>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center cursor-pointer focus:outline-none rounded-full ring-2 ring-transparent hover:ring-indigo-500/50 transition-all"
                aria-label="User Profile Menu"
              >
                <img
                  key={`${user?.id}-${updatedProfilePic || user?.profilePic}`}
                  src={
                    updatedProfilePic || user?.profilePic || assets.defaultProfile
                  }
                  alt={`${user?.username}'s Profile`}
                  className="object-cover rounded-full w-7 h-7 md:w-10 md:h-10 cursor-pointer"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error("Profile Image Error:", {
                      error: e,
                      attemptedSrc: e.target.src,
                      userId: user?.id,
                      profilePicUrl: updatedProfilePic || user?.profilePic,
                    });
                    e.target.onerror = null; // prevent infinite loop
                    e.target.src = assets.defaultProfile;
                  }}
                />
              </button>

              {isDropdownOpen && (
                <ProfileDropdown onClose={() => setIsDropdownOpen(false)} />
              )}
            </div>
          ) : (
            <Link to="/login">
              <button className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-pink-500 text-black font-medium hover:shadow-lg text-sm md:text-base cursor-pointer">
                Login
              </button>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
