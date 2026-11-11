import { m } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Footprints,
  PanelLeft,
  Search,
  Shirt,
  ShoppingBag,
  Swords,
} from "lucide-react";
import assets from "../../assets/asset";
import { ButtonLink } from "../ui/Button";
import Frame from "../ui/Frame";

const ease = [0.22, 1, 0.36, 1];
const rise = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease },
});

const SIDEBAR_LINKS = [
  { icon: ShoppingBag, label: "Shop all" },
  { icon: BookOpen, label: "Comics" },
  { icon: Swords, label: "Figures" },
  { icon: Shirt, label: "Apparel", active: true },
  { icon: Footprints, label: "Sneakers" },
];

const CART_LINES = [
  { label: "Survey Corps hoodie", meta: "M", dot: true },
  { label: "Akatsuki high-tops", meta: "42", dot: true },
  { label: "Naruto, vol. 1", meta: "V1" },
];

const SIZES = ["XS", "S", "M", "L", "XL"];
const ORDER_STEPS = ["Pending", "Processing", "Shipped", "Delivered"];

// Faded product tiles scattered behind the window, like prints pinned to a wall
const BackdropTile = ({ src, className }) => (
  <img src={src} alt="" aria-hidden="true" className={`pointer-events-none absolute hidden rounded-md object-cover opacity-35 grayscale-[35%] md:block ${className}`} />
);

// Illustration of the storefront: sidebar, a product page, and a floating order card
const StorefrontWindow = () => (
  <div className="relative">
    <BackdropTile src={assets.comicSao} className="-left-6 top-10 h-28 w-20 lg:-left-10" />
    <BackdropTile src={assets.posterGenos} className="-right-4 top-24 h-24 w-24 lg:-right-10" />
    <BackdropTile src={assets.comicPokemon} className="-bottom-6 left-24 h-20 w-16" />

    <m.div {...rise(0.35)} className="relative overflow-hidden rounded-panel border border-line bg-surface shadow-float">
      <div className="flex h-10 items-center gap-3 border-b border-line px-3.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <PanelLeft aria-hidden="true" className="size-3.5 text-subtle max-sm:hidden" />
        <ArrowLeft aria-hidden="true" className="size-3.5 text-subtle max-sm:hidden" />
        <ArrowRight aria-hidden="true" className="size-3.5 text-subtle max-sm:hidden" />
        <span className="mx-auto flex h-6 w-full max-w-60 items-center gap-1.5 rounded-md bg-sunken px-2 text-[11px] text-subtle">
          <Search aria-hidden="true" className="size-3" />
          Search the alley
        </span>
        <ShoppingBag aria-hidden="true" className="size-3.5 text-subtle" />
      </div>

      <div className="grid md:grid-cols-[190px_1fr]">
        <aside className="hidden border-r border-line p-3 md:block">
          <ul className="space-y-0.5">
            {SIDEBAR_LINKS.map(({ icon: Icon, label, active }) => (
              <li key={label} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] ${active ? "bg-sunken text-ink" : "text-ink-soft"}`}>
                <Icon aria-hidden="true" className="size-3.5" />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-5 px-2 text-[11px] font-medium text-subtle">In your cart · 3</p>
          <ul className="mt-1.5 space-y-0.5">
            {CART_LINES.map(({ label, meta, dot }) => (
              <li key={label} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-ink-soft">
                <span className="truncate">{label}</span>
                <span className="ml-auto text-[10.5px] text-subtle">{meta}</span>
                {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-info" />}
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:p-6">
          <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-canvas p-4">
            <img src={assets.hoodieSurveyCorps} alt="" className="max-h-full w-auto object-contain" />
          </div>
          <div className="flex flex-col">
            <p className="text-[11px] text-subtle">Apparel · Jackets</p>
            <p className="mt-1 text-[17px] font-medium tracking-[-0.01em] text-ink">Survey Corps hoodie</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              Two-tone zip hoodie with the Wings of Freedom crest on the back.
            </p>
            <p className="mt-4 text-[11px] text-subtle">Size</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SIZES.map((size) => (
                <span
                  key={size}
                  className={`flex h-7 min-w-9 items-center justify-center rounded-full border px-2 text-[11px] ${size === "M" ? "border-ink bg-ink text-white" : "border-line text-ink-soft"}`}
                >
                  {size}
                </span>
              ))}
            </div>
            <span className="mt-5 flex h-8 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-white">
              Add to cart
            </span>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-success">
              <Check aria-hidden="true" className="size-3.5" />
              Held for you while it&apos;s in your cart
            </p>
          </div>
        </div>
      </div>
    </m.div>

    <m.div
      initial={{ opacity: 0, x: 24, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.8, delay: 0.75, ease }}
      className="relative mx-auto -mt-10 w-[min(320px,88%)] lg:absolute lg:-right-8 lg:bottom-[-36px] lg:mt-0 lg:w-[300px]"
    >
      <m.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
        className="rounded-panel border border-line bg-surface p-4 shadow-float"
      >
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full bg-info-soft px-2 py-0.5 font-medium text-info">Processing</span>
          <span className="text-subtle">Order ORD-24-8F2A</span>
        </div>
        <p className="mt-2 text-[15px] font-medium tracking-[-0.01em] text-ink">Paid with card · 2 items</p>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line p-2.5">
          <img src={assets.sneakersAkatsuki} alt="" className="size-11 rounded-md bg-canvas object-contain" />
          <div className="min-w-0 text-[12px]">
            <p className="truncate font-medium text-ink">Akatsuki high-tops</p>
            <p className="text-subtle">Size 42 · Qty 1</p>
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-4 gap-1" aria-hidden="true">
          {ORDER_STEPS.map((step, index) => (
            <span key={step} className={`h-1 rounded-full ${index < 2 ? "bg-info" : "bg-sunken"}`} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-subtle">
          <span>Pending</span>
          <span>Delivered</span>
        </div>
      </m.div>
    </m.div>
  </div>
);

const Hero = () => (
  <Frame className="relative px-6 pb-20 pt-14 sm:pt-20 lg:pb-24">
    <m.h1 {...rise(0)} className="max-w-2xl text-[2.25rem] font-medium leading-[1.08] tracking-[-0.035em] text-ink text-balance sm:text-5xl">
      Meet Anime Alley, the shop for every fan&apos;s shelf
    </m.h1>
    <m.p {...rise(0.1)} className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
      Comics, figures, apparel and sneakers from the series you love. Your size is held while it&apos;s in your cart,
      and you can pay by card or on delivery.
    </m.p>
    <m.div {...rise(0.2)} className="mt-8 flex flex-wrap gap-2">
      <ButtonLink to="/shop" size="lg">
        Shop now
      </ButtonLink>
      <ButtonLink to="/login" variant="secondary" size="lg">
        Try a demo
      </ButtonLink>
    </m.div>

    <div className="mt-14 lg:mr-12">
      <StorefrontWindow />
    </div>
  </Frame>
);

export default Hero;
