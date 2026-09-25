import { useSelector, useDispatch } from "react-redux";
import {
  updateTotalPages,
  updateCurrPage,
  setLoading,
  setProductsCache,
} from "../../redux/Slice/shopSlice";
import { useEffect } from "react";
import Cards from "../Global/Card";
import Loader from "../Global/Loader";
import api from "../../api/api";
import ActiveFiltersDisplay from "./ActiveFiltersDisplay";

const ProductGrid = () => {
  const dispatch = useDispatch();
  //Access the category state and filters of that category from the redux store
  const products = useSelector((state) => state.shop.productsCache);
  const currCategory = useSelector((state) => state.shop.currCategory);
  const appliedFilters = useSelector((state) => state.shop.productTypes);
  const currPage = useSelector((state) => state.shop.currPage);
  const isLoading = useSelector((state) => state.shop.isLoading);

  useEffect(() => {
    if (products.length > 0) {
      dispatch(setLoading(false));
      return;
    }

    let isMounted = true;
    dispatch(setLoading(true));

    const fetchProducts = async () => {
      try {
        const { productTypes, price, sortBy, searchQuery } = appliedFilters;

        // Create a single object with all constraints
        const apiPayload = {
          category: currCategory.toLowerCase(),
          productTypes: productTypes || ["all"],
          price: typeof price === "number" ? price : (Number(price) || 0),
          sortBy: sortBy || "popular",
          page: currPage,
          searchQuery: searchQuery || "",
        };

        const response = await api.getProducts(apiPayload);
        if (!isMounted) return;

        dispatch(setLoading(false));

        if (response.data.success) {
          const { totalPages, currPageProducts } = response.data;

          dispatch(updateTotalPages(totalPages));

          // If we restored an out-of-range page from persistence, clamp to the last valid page
          if (totalPages > 0 && currPage > totalPages) {
            dispatch(updateCurrPage(totalPages));
            dispatch(setProductsCache([]));
            return;
          }

          dispatch(setProductsCache(currPageProducts));
        } else {
          console.error("Failed to fetch products:", response.data.message);
          dispatch(setProductsCache([]));
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching products:", error);
        dispatch(setLoading(false));
        dispatch(setProductsCache([]));
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [products.length, currCategory, appliedFilters, currPage, dispatch]);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col">
      {/* Active Filters Display */}
      <ActiveFiltersDisplay />

      {/* Product Grid */}
      <div className="w-full flex-1 min-h-[350px] lg:h-full overflow-y-auto flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 min-h-[350px]">
            <Loader size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[350px] text-white/60">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm text-white/40">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {/* Key prop helps React identify which items have changed, been added, or been removed in lists */}
            {products.map((product) => (
              <Cards key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;
