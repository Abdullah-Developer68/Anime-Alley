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
      <div className="absolute inset-0 bg-black opacity-70"></div>

      {/* Content section */}
      <div className="relative flex flex-col items-center justify-center h-full max-w-4xl p-8 mx-auto md:flex-row">
        <div className="max-w-md p-8 text-center bg-gray-900 border-2 border-red-600 rounded-lg shadow-lg bg-opacity-80 md:text-left">
          <h1 className="mb-4 text-4xl font-extrabold text-red-500">
            Action Heroes
          </h1>
          <p className="text-lg text-gray-300">
            Perfectly crafted for the ultimate collector.
          </p>
          <Link to="/shop" className="z-40">
            <button
              className="px-4 py-2 mt-6 font-bold text-white transition duration-300 bg-red-600 rounded-full hover:bg-red-700"
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
