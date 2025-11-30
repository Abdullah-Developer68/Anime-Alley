/* eslint-disable react/prop-types */
import { useDispatch } from "react-redux";
import { transferFilterData } from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";

const ActiveFiltersDisplay = ({ appliedFilters, currCategory }) => {
  const dispatch = useDispatch();
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
      (price && price > 0) ||
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
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get category display name
  const getCategoryDisplayName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Clear all filters
  const clearAllFilters = () => {
    dispatch(
      transferFilterData({
        productTypes: ["all"],
        sortBy: "popular",
        price: 0,
        searchQuery: "",
      })
    );
  };

  if (!hasActiveFilters()) {
    return null;
  }

  const {
    productTypes = [],
    price = 0,
    sortBy = "popular",
    searchQuery = "",
  } = appliedFilters;

  return (
    <div className="w-full mb-3 px-2 py-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
                    {searchQuery}
                  </span>
                </div>
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
                </span>
              );
            }

            // Price Filter
            if (price && price > 0) {
              filterItems.push(
                <span key="price" className="text-white/70">
                  Min: ${price}
                </span>
              );
            }

            // Sort By
            if (sortBy && sortBy !== "popular") {
              filterItems.push(
                <span key="sort" className="text-white/70">
                  {getSortDisplayName(sortBy)}
                </span>
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
              (price && price > 0) ||
              (sortBy && sortBy !== "popular");

            return (
              <div className="flex items-center gap-2">
                {hasFilters && <span className="text-white/40">•</span>}
                <span className="text-white/50 text-xs">
                  in {getCategoryDisplayName(currCategory)}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Clear All Button */}
        <button
          onClick={clearAllFilters}
          className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors duration-200 font-medium flex items-center gap-1 flex-shrink-0"
        >
          <span className="w-1 h-3 bg-yellow-500 rounded-full"></span>
          Clear All
        </button>
      </div>
    </div>
  );
};

export default ActiveFiltersDisplay;
