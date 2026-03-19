import assets from "../../assets/asset";

const Footer = () => {
  return (
    <footer className="py-3 bg-black border-t border-red-500 text-white/90 sm:py-6">
      <div className="container px-3 mx-auto">
        <div className="flex flex-col items-center gap-3 sm:gap-0 sm:flex-row sm:justify-between">
          {/* Logo and Title Section - More compact for mobile */}
          <div className="flex items-center gap-3">
            <img
              src={assets.footerPic}
              alt="Anime Alley Logo"
              className="object-contain w-12 h-12 border-2 border-red-500 rounded-full shadow-lg sm:w-16 sm:h-16"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">
                Anime Alley
              </h1>
              <p className="text-xs italic sm:text-sm text-white/70">
                Your Anime Collection Starts Here
              </p>
            </div>
          </div>

          {/* Navigation Links - Horizontal on mobile */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <a
              href="#"
              className="text-sm transition-colors hover:text-pink-500"
            >
              Home
            </a>
            <a
              href="#"
              className="text-sm transition-colors hover:text-pink-500"
            >
              About
            </a>
            <a
              href="#"
              className="text-sm transition-colors hover:text-pink-500"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm transition-colors hover:text-pink-500"
            >
              Contact
            </a>
          </div>

          {/* Social Media Icons - Compact spacing */}
          <div className="flex gap-3 sm:gap-4">
            <a
              href="#"
              className="text-lg transition-colors text-white/70 hover:text-pink-500 sm:text-xl"
              aria-label="Twitter"
            >
              <i className="fab fa-twitter"></i>
            </a>
            <a
              href="#"
              className="text-lg transition-colors text-white/70 hover:text-pink-500 sm:text-xl"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f"></i>
            </a>
            <a
              href="#"
              className="text-lg transition-colors text-white/70 hover:text-pink-500 sm:text-xl"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>

        {/* Footer Bottom - Reduced spacing */}
        <div className="mt-3 text-center sm:mt-6">
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
