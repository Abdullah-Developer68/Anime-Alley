import PropTypes from "prop-types";

// Each half of the track must be wider than the widest screen, so the item list is repeated
const REPEATS_PER_HALF = 3;

// An endless, slightly tilted strip of cards that scrolls on its own and pauses on hover
const TiltedMarquee = ({ items, duration = 45 }) => {
  const half = Array.from({ length: REPEATS_PER_HALF }, () => items).flat();
  // Two identical halves: translating by -50% lands exactly where the loop started
  const track = [...half, ...half];

  return (
    <div className="relative left-1/2 w-[120vw] -translate-x-1/2 -rotate-3 py-8">
      <div
        className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ "--marquee-duration": `${duration}s` }}
      >
        {track.map((item, index) => {
          const isClone = index >= items.length;
          return (
            // Padding instead of gap keeps both halves exactly the same width
            <div key={index} className="shrink-0 pr-5 md:pr-7" aria-hidden={isClone || undefined}>
              <figure
                className={`group relative w-[160px] overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl shadow-black/50 transition duration-300 hover:rotate-0 hover:scale-105 hover:border-pink-400/60 sm:w-[190px] md:w-[210px] ${
                  index % 2 === 0 ? "rotate-2" : "-rotate-2"
                }`}
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={item.img}
                    alt={isClone ? "" : item.label}
                    loading="lazy"
                    draggable="false"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 bg-ink-950/85 px-2 py-2 text-center text-xs font-semibold tracking-wide text-ink-50 sm:text-sm">
                  {item.label}
                </figcaption>
              </figure>
            </div>
          );
        })}
      </div>
    </div>
  );
};

TiltedMarquee.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({ img: PropTypes.string.isRequired, label: PropTypes.string.isRequired }),
  ).isRequired,
  duration: PropTypes.number,
};

export default TiltedMarquee;
