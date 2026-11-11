import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, m } from "motion/react";
import { PackageSearch } from "lucide-react";
import api from "../../api/api";
import { resetFilters, setLoading, setPage, setResults } from "../../redux/Slice/shopSlice";
import ProductCard from "./ProductCard";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

const PAGE_SIZE = 24;

// Fetches the page for the current category, filters and page number, then shows it
const ProductGrid = () => {
  const dispatch = useDispatch();
  const { currCategory, filters, currPage, products, productsKey, isLoading } = useSelector((state) => state.shop);
  const query = { category: currCategory, ...filters, page: currPage, limit: PAGE_SIZE };
  const key = JSON.stringify(query);

  useEffect(() => {
    if (productsKey === key)
      return;
    let active = true;
    dispatch(setLoading(true));
    api
      .getProducts(JSON.parse(key))
      .then(({ data }) => {
        if (!active)
          return;
        // A page restored from an older visit may be past the end now
        if (data.totalPages > 0 && JSON.parse(key).page > data.totalPages)
          return dispatch(setPage(data.totalPages));
        dispatch(setResults({ products: data.currPageProducts, totalPages: data.totalPages, totalProducts: data.totalProducts, key }));
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        if (active)
          dispatch(setResults({ products: [], totalPages: 1, totalProducts: 0, key }));
      });
    return () => {
      active = false;
    };
  }, [key, productsKey, dispatch]);

  if (isLoading && productsKey !== key)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[4/5.6] animate-pulse rounded-panel border border-line bg-surface" />
        ))}
      </div>
    );

  if (products.length === 0)
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products match"
        action={
          <Button variant="secondary" size="sm" onClick={() => dispatch(resetFilters())}>
            Clear filters
          </Button>
        }
      >
        Try a different search, type or price.
      </EmptyState>
    );

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={productsKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
      >
        {products.map((product, index) => (
          <ProductCard key={product._id} product={product} priority={index < 4} />
        ))}
      </m.div>
    </AnimatePresence>
  );
};

export default ProductGrid;
