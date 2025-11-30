import assets from "../../assets/asset";
import { Link } from "react-router-dom";

const Banner = () => {
  return (
    <div
      className="relative w-full h-[690px] mt-12 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${assets.banner})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black opacity-75"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-8 items-start max-[400px]:ml-8 p-6 md:p-9 mt-56 ml-20">
        <h1 className="text-red-700 animate-pulse font-bold text-2xl md:text-5xl -skew-x-12">
          Anime Alley
        </h1>
        <span className="md:text-xl text-white w-[350px] -skew-x-12">
          Your one-stop shop for exclusive anime merchandise and collectibles!
        </span>
        <Link to="/shop">
          <button
            className="relative flex items-center justify-center py-3 px-8 cursor-pointer bg-gradient-to-r from-red-800 to-orange-600 text-white font-extrabold text-lg uppercase tracking-widest rounded-lg shadow-[0px_4px_15px_rgba(255,100,0,0.7)] 
            border-4 border-red-600 hover:bg-gradient-to-r hover:from-orange-600 hover:to-yellow-400 hover:scale-105 transition-transform duration-200 ease-out 
            after:content-[''] after:absolute after:-inset-1 after:border-2 after:border-yellow-400 after:rounded-lg after:opacity-0 hover:after:opacity-100 hover:after:shadow-[0px_0px_15px_rgba(255,255,100,0.8)] -skew-x-12"
          >
            Shop Now
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Banner;
