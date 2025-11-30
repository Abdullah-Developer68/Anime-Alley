import assets from "../../assets/asset";

const Footer = () => {
  return (
    <footer className="bg-black text-white/90 py-3 sm:py-6 border-t border-red-500">
      <div className="container mx-auto px-3">
        <div className="flex flex-col items-center gap-3 sm:gap-0 sm:flex-row sm:justify-between">
          {/* Logo and Title Section - More compact for mobile */}
          <div className="flex items-center gap-3">
            <img
              src={assets.footerPic}
              alt="Anime Alley Logo"
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain shadow-lg border-2 border-red-500 rounded-full"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">
                Anime Alley
              </h1>
              <p className="text-xs sm:text-sm italic text-white/70">
                Your Anime Collection Starts Here
              </p>
            </div>
          </div>

          {/* Navigation Links - Horizontal on mobile */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <a
              href="#"
              className="text-sm hover:text-pink-500 transition-colors"
            >
              Home
            </a>
            <a
              href="#"
              className="text-sm hover:text-pink-500 transition-colors"
            >
              About
            </a>
            <a
              href="#"
              className="text-sm hover:text-pink-500 transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm hover:text-pink-500 transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Social Media Icons - Compact spacing */}
          <div className="flex gap-3 sm:gap-4">
            <a
              href="#"
              className="text-white/70 hover:text-pink-500 transition-colors text-lg sm:text-xl"
              aria-label="Twitter"
            >
              <i className="fab fa-twitter"></i>
            </a>
            <a
              href="#"
              className="text-white/70 hover:text-pink-500 transition-colors text-lg sm:text-xl"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f"></i>
            </a>
            <a
              href="#"
              className="text-white/70 hover:text-pink-500 transition-colors text-lg sm:text-xl"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>

        {/* Footer Bottom - Reduced spacing */}
        <div className="text-center mt-3 sm:mt-6">
          <p className="text-white/60 text-[10px] sm:text-xs">
            © {new Date().getFullYear()} Anime Alley. All rights reserved.
          </p>
          <p className="text-white/40 text-[10px] sm:text-xs">
            Bringing anime collectibles to life
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
