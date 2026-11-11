import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, m } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import ShopFilters from "../components/Shop/ShopFilters";
import ProductGrid from "../components/Shop/ProductGrid";
import ActiveFilters from "../components/Shop/ActiveFilters";
import Frame from "../components/ui/Frame";
import Pagination from "../components/ui/Pagination";
import Button from "../components/ui/Button";
import { inputClass, cx } from "../components/ui/styles";
import { setFilters, setFiltersOpen, setPage } from "../redux/Slice/shopSlice";
import { CATEGORIES, SORT_OPTIONS } from "../utils/catalog";

const Shop = () => {
  const dispatch = useDispatch();
  const { currCategory, filters, currPage, totalPages, totalProducts, filtersOpen, isLoading } = useSelector((state) => state.shop);
  const category = CATEGORIES.find(({ id }) => id === currCategory);

  // The mobile drawer locks the page behind it and closes with Escape
  useEffect(() => {
    if (!filtersOpen)
      return;
    const onKey = (e) => e.key === "Escape" && dispatch(setFiltersOpen(false));
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen, dispatch]);

  const changePage = (page) => {
    dispatch(setPage(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Frame className="grid flex-1 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line lg:block">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto px-4 py-8">
          <ShopFilters />
        </div>
      </aside>

      <AnimatePresence>
        {filtersOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <m.div
              className="absolute inset-0 bg-ink/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(setFiltersOpen(false))}
            />
            <m.aside
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="absolute inset-y-0 left-0 w-[min(320px,88vw)] overflow-y-auto border-r border-line bg-canvas p-5 shadow-float"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[15px] font-medium text-ink">Filters</p>
                <Button variant="ghost" size="icon-sm" aria-label="Close filters" onClick={() => dispatch(setFiltersOpen(false))}>
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <ShopFilters />
            </m.aside>
          </div>
        )}
      </AnimatePresence>

      <section className="min-w-0 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Shop</p>
            <h1 className="mt-1.5 text-3xl font-medium tracking-[-0.03em] text-ink">
              {category?.label}
              <span className="ml-2.5 text-lg tracking-normal text-subtle tabular-nums">{isLoading ? "" : totalProducts}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => dispatch(setFiltersOpen(true))}>
              <SlidersHorizontal aria-hidden="true" className="size-3.5" />
              Filters
            </Button>
            <label htmlFor="shop-sort" className="sr-only">
              Sort by
            </label>
            <select
              id="shop-sort"
              value={filters.sortBy}
              onChange={(e) => dispatch(setFilters({ sortBy: e.target.value }))}
              className={cx(inputClass, "h-8! w-auto! rounded-full! pr-8! text-[13px]")}
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 min-h-7">
          <ActiveFilters />
        </div>

        <div className="mt-5">
          <ProductGrid />
        </div>

        <Pagination page={currPage} totalPages={totalPages} onPageChange={changePage} label="Product pages" className="mt-10 justify-center" />
      </section>
    </Frame>
  );
};

export default Shop;
