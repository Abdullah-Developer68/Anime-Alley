import TiltedMarquee from "./TiltedMarquee";
import assets from "../../assets/asset";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCategory } from "../../redux/Slice/shopSlice";

const COMICS = [
  { img: assets.dragonBallComic, label: "Dragon Ball Z" },
  { img: assets.narutoComic, label: "Naruto" },
  { img: assets.pokemonComic, label: "Pokemon" },
  { img: assets.saoComic, label: "SAO" },
];

const ComicsSection = () => {
  const dispatch = useDispatch();
  return (
    <section
      className="relative flex h-[690px] w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${assets.comicBackground})` }}
    >
      {/* Dark overlay */}
      <div className="pointer-events-none absolute inset-0 bg-ink-950 opacity-80"></div>

      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <h2 className="font-display text-4xl font-bold tracking-tight text-white">Buy Comics</h2>
        <Link to="/shop">
          <button
            className="mt-5 w-fit cursor-pointer rounded-full bg-pink-500 px-5 py-2 font-semibold text-ink-950 transition-colors hover:bg-pink-400"
            onClick={() => dispatch(setCategory("comics"))}
          >
            Checkout
          </button>
        </Link>
      </div>

      <div className="relative z-10 mt-8 w-full">
        <TiltedMarquee items={COMICS} />
      </div>
    </section>
  );
};

export default ComicsSection;
