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
        <div className="absolute inset-0 bg-ink-950 opacity-80 pointer-events-none "></div>
        <div className="container flex flex-col items-center justify-center px-4 mx-auto max-w-screen-2xl md:px-20">
          <span className="z-40 mt-40 font-display text-4xl font-bold tracking-tight text-center text-white">
            Buy Comics
          </span>
          <Link to="/shop" className="z-40">
            <button
              className="z-40 px-5 py-2 mt-5 font-semibold text-ink-950 bg-pink-500 rounded-full cursor-pointer w-fit transition-colors hover:bg-pink-400"
              onClick={() => dispatch(setCategory("comics"))}
            >
              Checkout
            </button>
          </Link>
          <div className="z-40 mt-10 w-3xl">
            <CardSlider />
          </div>
        </div>
      </div>
    </>
  );
};

export default ComicsSection;
