import CardSlider from "./CardSlider";
import assets from "../../assets/asset";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCategory } from "../../redux/Slice/shopSlice";

const ComicsSection = () => {
  const dispatch = useDispatch();
  return (
    <>
      <div
        className={`relative flex flex-col items-center w-full h-[690px] overflow-hidden bg-cover bg-center bg-no-repeat`}
        style={{ backgroundImage: `url(${assets.comicBackground})` }}
      >
        {" "}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black opacity-75 pointer-events-none "></div>
        <div className="max-w-screen-2xl flex flex-col items-center justify-center container mx-auto md:px-20 px-4">
          <span className="text-white font-bold text-center text-4xl z-40 mt-40">
            Buy Comics
          </span>
          <Link to="/shop" className="z-40">
            <button
              className="mt-5 bg-white w-fit py-2 px-5 rounded-full text-black hover:bg-black hover:text-white z-40 cursor-pointer"
              onClick={() => dispatch(setCategory("comics"))}
            >
              Checkout
            </button>
          </Link>
          <div className="z-40 w-3xl mt-10">
            <CardSlider />
          </div>
        </div>
      </div>
    </>
  );
};

export default ComicsSection;
