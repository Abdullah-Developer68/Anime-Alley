import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import assets from "../../assets/asset";
import useAuth from "../../Hooks/UseAuth";
import Logout from "./Logout";

const Navbar = () => {
  const { user } = useAuth();
  const updatedProfilePic = useSelector(
    (state) => state.dashboard.updatedProfilePic
  );

  return (
    <>
      <nav className="w-full fixed top-0 bg-gradient-to-r bg-[#0F172A] flex justify-between items-center px-3 py-1.5 md:px-4 md:py-2 shadow-lg shadow-indigo-500/10 z-50">
        <span className="flex items-center gap-2 md:gap-3">
          {/* Logo */}
          <img
            src={assets.logo}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full ring-1 ring-black shadow-lg"
            alt="Logo"
          />
        </span>

        {/* Search and Auth */}
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
            <div className="flex items-center gap-2 md:gap-4">
              <img
                key={`${user?.id}-${updatedProfilePic || user?.profilePic}`}
                src={
                  updatedProfilePic || user?.profilePic || assets.defaultProfile
                }
                alt={`${user?.username}'s Profile`}
                className="w-7 h-7 md:w-10 md:h-10 rounded-full object-cover"
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
              <Logout />
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
