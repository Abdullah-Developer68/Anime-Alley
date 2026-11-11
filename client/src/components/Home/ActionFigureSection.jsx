import assets from "../../assets/asset";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCategory } from "../../redux/Slice/shopSlice";

const ActionFigureSection = () => {
  const dispatch = useDispatch();

  return (
    <div
      className={`relative flex flex-col md:flex-row justify-center items-center overflow-hidden h-screen bg-cover bg-center bg-no-repeat bg-opacity-75`}
      style={{ backgroundImage: `url(${assets.battleGround})` }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-ink-950 opacity-75"></div>

      {/* Content section */}
      <div className="relative flex flex-col items-center justify-center h-full max-w-4xl p-8 mx-auto md:flex-row">
        <div className="max-w-md p-8 text-center bg-ink-900/90 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 md:text-left">
          <h1 className="mb-4 text-4xl font-extrabold text-pink-500">
            Action Heroes
          </h1>
          <p className="text-lg text-gray-300">
            Perfectly crafted for the ultimate collector.
          </p>
          <Link to="/shop" className="z-40">
            <button
              className="px-4 py-2 mt-6 font-bold text-ink-950 transition duration-300 bg-pink-500 rounded-full cursor-pointer hover:bg-pink-400"
              onClick={() => dispatch(setCategory("toys"))}
            >
              Explore Now
            </button>
          </Link>
        </div>

        {/* Image section */}
        <div className="relative flex-shrink-0 md:ml-8">
          <img
            src={assets.jin}
            alt="Action Figure"
            className="z-10 h-[400px] md:h-[700px] mt-8 md:mt-0"
          />
        </div>
      </div>
    </div>
  );
};

export default ActionFigureSection;
