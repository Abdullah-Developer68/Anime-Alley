import { Link } from "react-router-dom";
import assets from "../../assets/asset";

const Footer = () => {
  return (
    <footer className="relative z-30 w-full py-3.5 sm:py-4 bg-black border-t border-red-500/80 text-white/90">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        {/* Main Footer Row: Brand on far left, Navigation links on far right */}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-0">
          {/* Logo and Title Section on Far Left */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src={assets.footerPic}
              alt="Anime Alley Logo"
              className="object-contain w-9 h-9 border-2 border-red-500 rounded-full shadow-lg sm:w-10 sm:h-10"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl leading-tight">
                Anime Alley
              </h1>
              <p className="text-[11px] sm:text-xs italic text-white/70">
                Your Anime Collection Starts Here
              </p>
            </div>
          </div>

          {/* Navigation Links on Far Right */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:justify-end sm:gap-6">
            <Link
              to="/"
              className="text-xs sm:text-sm font-medium transition-colors text-white/80 hover:text-yellow-400"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="text-xs sm:text-sm font-medium transition-colors text-white/80 hover:text-yellow-400"
            >
              About
            </Link>
            <Link
              to="/privacy"
              className="text-xs sm:text-sm font-medium transition-colors text-white/80 hover:text-yellow-400"
            >
              Privacy
            </Link>
            <Link
              to="/contact"
              className="text-xs sm:text-sm font-medium transition-colors text-white/80 hover:text-yellow-400"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Subtle separator and bottom credits */}
        <div className="flex flex-col items-center justify-between pt-2.5 mt-3 text-[11px] sm:text-xs border-t sm:flex-row border-white/10 text-white/60 gap-1 sm:gap-0">
          <p>© {new Date().getFullYear()} Anime Alley. All rights reserved.</p>
          <p className="italic text-white/40">Bringing anime collectibles to life</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
