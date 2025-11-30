import { useSelector, useDispatch } from "react-redux";
import {
  updateTotalPages,
  updateCurrPage,
  setLoading,
} from "../../redux/Slice/shopSlice";
import { useEffect, useState } from "react";
import Cards from "../Global/Card";
import Loader from "../Global/Loader";
import api from "../../api/api";
import ActiveFiltersDisplay from "./ActiveFiltersDisplay";

const ProductGrid = () => {
  const [products, setProducts] = useState([]);
  const dispatch = useDispatch();
  //Access the category state and filters of that category from the redux store
  const currCategory = useSelector((state) => state.shop.currCategory);
  const appliedFilters = useSelector((state) => state.shop.productTypes);
  const currPage = useSelector((state) => state.shop.currPage);
  const isLoading = useSelector((state) => state.shop.isLoading);

  // reset page to 1 after category changes
  useEffect(() => {
    dispatch(updateCurrPage(1));
  }, [currCategory, dispatch]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Set loading state with a small delay to prevent flickering for fast API calls
        const loadingTimer = setTimeout(() => {
          dispatch(setLoading(true));
        }, 200);

        const { productTypes, price, sortBy, searchQuery } = appliedFilters;

        // Create a single object with all constraints
        const apiPayload = {
          category: currCategory.toLowerCase(),
          productTypes: productTypes || ["all"],
          price: price || 0,
          sortBy: sortBy || "popular",
          page: currPage,
          searchQuery: searchQuery || "",
        };

        const response = await api.getProducts(apiPayload);

        // Clear the loading timer since API call completed
        clearTimeout(loadingTimer);
        dispatch(setLoading(false));

        if (response.data.success) {
          setProducts(response.data.currPageProducts);
          dispatch(updateTotalPages(response.data.totalPages));
        } else {
          console.error("Failed to fetch products:", response.data.message);
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        dispatch(setLoading(false));
        setProducts([]);
      }
    };
    fetchProducts();
  }, [currCategory, appliedFilters, currPage, dispatch]);

  return (
    <div className="w-full">
      {/* Active Filters Display */}
      <ActiveFiltersDisplay
        appliedFilters={appliedFilters}
        currCategory={currCategory}
      />

      {/* Product Grid */}
      <div className="w-full h-[600px] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-2">
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
