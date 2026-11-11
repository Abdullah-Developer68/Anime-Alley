import { m } from "motion/react";
import { ArrowRight } from "lucide-react";
import useOpenCategory from "../../Hooks/useOpenCategory";
import { CATEGORIES } from "../../utils/catalog";
import Frame from "../ui/Frame";
import Reveal from "../ui/Reveal";
import TwoTone from "../ui/TwoTone";

// Four large category tiles, each opening the shop on that category
const CategoryShowcase = () => {
  const openCategory = useOpenCategory();

  return (
    <Frame as="section" className="px-6 py-16 sm:py-20">
      <Reveal>
        <TwoTone top="Every aisle you need," bottom="in one alley." className="text-3xl sm:text-4xl" />
      </Reveal>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map(({ id, label, blurb, image, icon: Icon }, index) => (
          <Reveal key={id} delay={index * 0.08} className="h-full">
            <m.button
              type="button"
              onClick={() => openCategory(id)}
              whileHover="hover"
              className="group flex h-full w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-left transition-shadow duration-300 hover:shadow-float"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-line bg-canvas">
                <m.img
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  variants={{ hover: { scale: 1.06 } }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className={id === "comics" ? "h-[115%] w-auto -rotate-6 rounded-md object-cover shadow-panel" : "h-[82%] w-auto object-contain"}
                />
              </div>
              <div className="flex items-center gap-3 p-4">
                <span className="flex size-8 items-center justify-center rounded-full border border-line text-ink-soft">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block truncate text-xs text-muted">{blurb}</span>
                </span>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
            </m.button>
          </Reveal>
        ))}
      </div>
    </Frame>
  );
};

export default CategoryShowcase;
