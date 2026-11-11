import PropTypes from "prop-types";

// Each half of the track must be wider than the widest screen, so the item list is repeated
const REPEATS_PER_HALF = 3;

// Masthead colours cycle per title, like the cover bands on a comic rack
const MASTHEADS = ["bg-pink-500", "bg-yellow-300", "bg-sky-400", "bg-red-500"];

// An endless, tilted strip of comic book covers that scrolls on its own and pauses on hover
const TiltedMarquee = ({ items, duration = 45 }) => {
  const half = Array.from({ length: REPEATS_PER_HALF }, () => items).flat();
  // Two identical halves: translating by -50% lands exactly where the loop started
  const track = [...half, ...half];

  return (
    <div className="relative left-1/2 w-[120vw] -translate-x-1/2 -rotate-3 py-10">
      <div
        className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ "--marquee-duration": `${duration}s` }}
      >
        {track.map((item, index) => {
          const issue = (index % items.length) + 1;
          const isClone = index >= items.length;
          return (
            // Padding instead of gap keeps both halves exactly the same width
            <div key={index} className="shrink-0 pr-7 md:pr-9" aria-hidden={isClone || undefined}>
              <figure className="group w-[160px] rotate-3 transition-transform duration-300 hover:-translate-y-2 sm:w-[185px] md:w-[205px]">
                {/* Cream and black offsets read as the page block behind the cover */}
                <div className="relative overflow-hidden rounded-[3px] border-[3px] border-black bg-ink-950 shadow-[3px_3px_0_0_#f3ecd9,6px_6px_0_0_#000] transition-shadow duration-300 group-hover:shadow-[4px_4px_0_0_#f3ecd9,8px_8px_0_0_#000,16px_16px_0_0_rgb(0_0_0/0.35)]">
                  <div
                    className={`flex items-center justify-between gap-2 border-b-[3px] border-black px-2 py-1.5 ${MASTHEADS[(issue - 1) % MASTHEADS.length]}`}
                  >
                    <figcaption className="min-w-0 truncate font-comic text-xl leading-none tracking-wide text-white [-webkit-text-stroke:1.5px_black] [paint-order:stroke_fill] md:text-2xl">
                      {item.label}
                    </figcaption>
                    <span className="shrink-0 border-2 border-black bg-white px-1 font-comic text-xs leading-tight tracking-wide text-black">
                      No.{issue}
                    </span>
                  </div>

                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={item.img}
                      alt={isClone ? "" : item.label}
                      loading="lazy"
                      draggable="false"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Spine: a shaded strip and a fold line down the left edge */}
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5 bg-black/30" />
                    <span aria-hidden="true" className="absolute inset-y-0 left-2.5 w-px bg-black/50" />
                  </div>
                </div>
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
