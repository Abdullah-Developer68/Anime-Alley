import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, useReducedMotion } from "framer-motion";
import { setCategory } from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";

// Fan angle and vertical lift per stem: the inner pair stand taller, like the centre of a bouquet
const BOUQUET = [
  { image: assets.aotHoddie, label: "Hoodie", angle: -28, lift: 0 },
  { image: assets.narutoShoes, label: "Shoes", angle: -9, lift: 36 },
  { image: assets.jjkPants, label: "Pants", angle: 9, lift: 36 },
  { image: assets.soloShoes, label: "Sneakers", angle: 28, lift: 0 },
];

const ClothesSection = () => {
  const dispatch = useDispatch();
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative flex min-h-[690px] w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${assets.halloweenBackground})` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black opacity-30"></div>

      {/* Zero-size anchor where the stems meet, offset so the bouquet's visual centre is the section centre */}
      <div className="absolute left-1/2 top-1/2 h-0 w-0 translate-y-[92px] sm:translate-y-[115px] md:translate-y-[138px]">
        {BOUQUET.map((item, index) => (
          <motion.div
            key={item.label}
            className="absolute bottom-0 left-0 w-[120px] sm:w-[150px] md:w-[180px]"
            style={{ x: "-50%", transformOrigin: "50% 150%" }}
            initial={reduceMotion ? false : { rotate: 0, y: 60, opacity: 0 }}
            whileInView={{ rotate: item.angle, y: -item.lift, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 70, damping: 14, delay: index * 0.08 }}
          >
            <motion.div
              style={{ transformOrigin: "50% 150%" }}
              animate={reduceMotion ? undefined : { rotate: [0, 1.6, 0, -1.6, 0] }}
              transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut" }}
            >
              <figure className="group relative overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 transition-transform duration-300 hover:-translate-y-3">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.label}
                    draggable="false"
                    className="h-full w-full object-cover object-center brightness-[0.6] transition duration-500 group-hover:scale-105 group-hover:brightness-100"
                  />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 bg-ink-950/85 py-1.5 text-center text-xs font-semibold tracking-wide text-yellow-300 sm:text-sm">
                  {item.label}
                </figcaption>
              </figure>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Copy sits in front of the bouquet; only the button takes clicks so the cards stay hoverable */}
      <div className="pointer-events-none relative z-20 flex flex-col items-center px-4 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-yellow-400 [text-shadow:0_2px_16px_rgb(0_0_0/0.7)] md:text-4xl lg:text-5xl">
          Spooky Fashion Collection
        </h2>
        <Link to="/shop" className="pointer-events-auto mt-6">
          <span
            className="block cursor-pointer rounded-full bg-yellow-400 px-6 py-2.5 font-semibold text-ink-950 shadow-lg shadow-black/40 transition-colors hover:bg-yellow-300"
            onClick={() => dispatch(setCategory("clothes"))}
          >
            Shop Now!
          </span>
        </Link>
      </div>
    </section>
  );
};

export default ClothesSection;
