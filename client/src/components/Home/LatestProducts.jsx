import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Inbox } from "lucide-react";
import api from "../../api/api";
import useOpenCategory from "../../Hooks/useOpenCategory";
import { CATEGORIES } from "../../utils/catalog";
import ProductCard from "../Shop/ProductCard";
import EmptyState from "../ui/EmptyState";
import Frame from "../ui/Frame";
import Reveal from "../ui/Reveal";
import TwoTone from "../ui/TwoTone";
import { buttonClass, cx } from "../ui/styles";

const PREVIEW_SIZE = 4;

// A live peek at the catalog: four products from the chosen category
const LatestProducts = () => {
  const openCategory = useOpenCategory();
  const [category, setCategory] = useState("comics");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    api
      .getProducts({ category, page: 1, limit: PREVIEW_SIZE, sortBy: "popular", productTypes: ["all"], price: 0, searchQuery: "" })
      .then((res) => {
        if (!active)
          return;
        setProducts(res.data.currPageProducts || []);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <Frame as="section" className="border-t border-line px-6 py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <TwoTone top="Fresh on the shelves" bottom="this week." className="text-3xl sm:text-4xl" />
        </Reveal>
        <div role="tablist" aria-label="Category" className="flex rounded-full border border-line bg-surface p-1">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              onClick={() => setCategory(id)}
              className={cx(
                "h-8 rounded-full px-3.5 text-[13px] transition-colors",
                category === id ? "bg-ink text-white" : "text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 min-h-[22rem]">
        <AnimatePresence mode="wait">
          <m.div
            key={`${category}-${status}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {status === "loading" ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: PREVIEW_SIZE }, (_, i) => (
                  <div key={i} className="aspect-[4/5.6] animate-pulse rounded-panel border border-line bg-surface" />
                ))}
              </div>
            ) : status === "error" || products.length === 0 ? (
              <EmptyState icon={Inbox} title={status === "error" ? "The shop couldn't be reached." : "Nothing here yet."}>
                {status === "error" ? "Please try again in a moment." : "New stock for this category is on its way."}
              </EmptyState>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <button type="button" onClick={() => openCategory(category)} className={buttonClass({ variant: "secondary", className: "mt-8" })}>
        See all {CATEGORIES.find(({ id }) => id === category)?.label.toLowerCase()}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </Frame>
  );
};

export default LatestProducts;
