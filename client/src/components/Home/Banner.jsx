import assets from "../../assets/asset";
import { Link } from "react-router-dom";

const Banner = () => {
  return (
    <div
      className="relative w-full h-[690px] mt-12 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${assets.banner})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-ink-950/80"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-8 items-start max-[400px]:ml-8 p-6 md:p-9 mt-56 ml-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-pink-500 -skew-x-12 md:text-5xl">
          Anime Alley
        </h1>
        <span className="md:text-xl font-medium text-ink-100 w-[350px] -skew-x-12">
          Your one-stop shop for exclusive anime merchandise and collectibles!
        </span>
        <Link to="/shop">
          <button
            className="relative flex items-center justify-center py-3 px-8 cursor-pointer bg-pink-500 text-ink-950 font-extrabold text-lg uppercase tracking-widest rounded-lg border-2 border-pink-400 shadow-lg shadow-pink-500/30 hover:bg-yellow-400 hover:border-yellow-300 hover:shadow-yellow-400/30 hover:scale-105 transition duration-200 ease-out -skew-x-12"
          >
            Shop Now
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Banner;
