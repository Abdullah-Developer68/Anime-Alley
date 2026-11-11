import { m } from "motion/react";

const SERIES = [
  "Naruto",
  "Dragon Ball",
  "Pokémon",
  "Sword Art Online",
  "Jujutsu Kaisen",
  "Attack on Titan",
  "One Punch Man",
  "Solo Leveling",
];

// Endless row of the series we stock. The list is doubled and slid by half its width, so the loop
// is seamless. With "reduce motion" on, MotionConfig keeps it still.
const SeriesStrip = () => (
  <section aria-label="Series in the shop" className="relative overflow-hidden border-y border-line bg-canvas">
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r from-canvas to-transparent" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l from-canvas to-transparent" />
    <m.ul
      className="flex w-max items-center py-7"
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
    >
      {[...SERIES, ...SERIES].map((name, index) => (
        <li
          key={`${name}-${index}`}
          aria-hidden={index >= SERIES.length}
          className="px-8 text-[19px] font-semibold tracking-[-0.02em] whitespace-nowrap text-subtle sm:px-11 sm:text-[22px]"
        >
          {name}
        </li>
      ))}
    </m.ul>
  </section>
);

export default SeriesStrip;
