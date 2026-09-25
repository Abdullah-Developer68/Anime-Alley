import { useSelector, useDispatch } from "react-redux";
import {
  transferFilterData,
  updateCurrPage,
  setProductsCache,
} from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";

const ActiveFiltersDisplay = () => {
  const dispatch = useDispatch();
  const appliedFilters = useSelector((state) => state.shop.productTypes);
  const currCategory = useSelector((state) => state.shop.currCategory);

  // Check if any filters are applied
  const hasActiveFilters = () => {
    if (!appliedFilters || Object.keys(appliedFilters).length === 0)
      return false;

    const {
      productTypes = [],
      price = 0,
      sortBy = "popular",
      searchQuery = "",
    } = appliedFilters;

    return (
      (searchQuery && searchQuery.trim() !== "") ||
      (price && price > 0 && price < 100) ||
      (productTypes &&
        productTypes.length > 0 &&
        !productTypes.includes("all")) ||
      (sortBy && sortBy !== "popular")
    );
  };

  // Get display name for sort options
  const getSortDisplayName = (sortBy) => {
    switch (sortBy) {
      case "price-low":
        return "Price: Low to High";
      case "price-high":
        return "Price: High to Low";
      case "popular":
        return "Most Popular";
      default:
        return "Most Popular";
    }
  };

  // Get display name for product types
  const getProductTypeDisplayName = (type) => {
    if (!type || typeof type !== "string") return "";
    return type
      .split(/[- ]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-");
  };

  // Get category display name
  const getCategoryDisplayName = (category) => {
    if (!category || typeof category !== "string") return "";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Clear single price filter
  const clearPriceFilter = () => {
    dispatch(
      transferFilterData({
        ...appliedFilters,
        price: 0,
      }),
    );
    dispatch(updateCurrPage(1));
    dispatch(setProductsCache([]));
  };

  // Clear all filters
  const clearAllFilters = () => {
    dispatch(
      transferFilterData({
        productTypes: ["all"],
        sortBy: "popular",
        price: 0,
        searchQuery: "",
      }),
    );
    dispatch(updateCurrPage(1));
    dispatch(setProductsCache([]));
  };

  if (!hasActiveFilters()) return null;

  const {
    productTypes = [],
    price = 0,
    sortBy = "popular",
    searchQuery = "",
  } = appliedFilters;

  return (
    <div className="w-full px-2 py-2 mb-3 border rounded-lg bg-black/20 backdrop-blur-sm border-white/10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Active Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Build filter items array to avoid trailing bullets */}
          {(() => {
            const filterItems = [];

            // Search Query
            if (searchQuery && searchQuery.trim() !== "") {
              filterItems.push(
                <div
                  key="search"
                  className="flex items-center gap-1.5 text-white/70"
                >
                  <img
                    src={assets.search}
                    alt="search"
                    className="w-3 h-3 opacity-70"
                  />
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">
                    "{searchQuery}"
                  </span>
                </div>,
              );
            }

            // Product Types
            if (
              productTypes &&
              productTypes.length > 0 &&
              !productTypes.includes("all")
            ) {
              filterItems.push(
                <span
                  key="types"
                  className="text-white/70 truncate max-w-[120px] sm:max-w-[200px]"
                >
                  {productTypes
                    .map((type) => getProductTypeDisplayName(type))
                    .join(", ")}
                </span>,
              );
            }

            // Price Filter
            if (price && price > 0 && price < 100) {
              filterItems.push(
                <div
                  key="price"
                  className="flex items-center gap-1 text-white/70"
                >
                  <span>Up to ${price}</span>
                  <button
                    type="button"
                    onClick={clearPriceFilter}
                    className="ml-0.5 text-xs text-white/40 hover:text-yellow-400 transition-colors cursor-pointer"
                    title="Remove price filter"
                  >
                    ×
                  </button>
                </div>,
              );
            }

            // Sort By
            if (sortBy && sortBy !== "popular") {
              filterItems.push(
                <span key="sort" className="text-white/70">
                  {getSortDisplayName(sortBy)}
                </span>,
              );
            }

            // Render items with bullets between them
            return filterItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item}
                {index < filterItems.length - 1 && (
                  <span className="text-white/40">•</span>
                )}
              </div>
            ));
          })()}

          {/* Category - always shown */}
          {(() => {
            const hasFilters =
              (searchQuery && searchQuery.trim() !== "") ||
              (productTypes &&
                productTypes.length > 0 &&
                !productTypes.includes("all")) ||
              (price && price > 0 && price < 100) ||
              (sortBy && sortBy !== "popular");

            return (
              <div className="flex items-center gap-2">
                {hasFilters && <span className="text-white/40">•</span>}
                <span className="text-xs text-white/50">
                  in {getCategoryDisplayName(currCategory)}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Clear All Button */}
        <button
          onClick={clearAllFilters}
          className="flex items-center flex-shrink-0 gap-1 text-xs font-medium text-yellow-500 transition-colors duration-200 cursor-pointer hover:text-yellow-400"
        >
          <span className="w-1 h-3 bg-yellow-500 rounded-full"></span>
          Clear All
        </button>
      </div>
    </div>
  );
};

export default ActiveFiltersDisplay;
