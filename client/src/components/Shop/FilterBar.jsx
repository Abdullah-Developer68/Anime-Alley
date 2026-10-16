import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import {
  openFilterBar,
  transferFilterData,
  updateCurrPage,
  setProductsCache,
} from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";
import ProductNav from "./ProductNav";
import ClearFilterButton from "../Global/ClearFilterButton";
import { useState, useEffect, useMemo } from "react";
import { formatPrice } from "../../utils/formatPrice";

const FilterBar = () => {
  // Redux state hooks
  const currCategory = useSelector((state) => state.shop.currCategory);
  const barState = useSelector((state) => state.shop.openFilterBar);
  const appliedFilters = useSelector((state) => state.shop.productTypes);
  const dispatch = useDispatch();

  // Local component state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availProductTypes, setAvailProductTypes] = useState([]);

  // Helper to extract initial values from Redux state
  const getInitialValues = (availTypes = []) => {
    const rawPrice = Number(appliedFilters?.price);
    const initialPrice =
      !isNaN(rawPrice) && rawPrice > 0 && rawPrice < 100 ? rawPrice : 100;
    const initialTypes =
      appliedFilters?.productTypes && appliedFilters.productTypes.length > 0
        ? appliedFilters.productTypes
            .map((t) => {
              const match = availTypes.find(
                (item) => item.toLowerCase() === t.toLowerCase(),
              );
              return (
                match ||
                (t.toLowerCase() === "all"
                  ? "All"
                  : t.charAt(0).toUpperCase() + t.slice(1))
              );
            })
            .filter(Boolean)
        : ["All"];

    return {
      productTypes: initialTypes.length > 0 ? initialTypes : ["All"],
      price: initialPrice,
      sortBy: appliedFilters?.sortBy || "popular",
      searchQuery: appliedFilters?.searchQuery || "",
    };
  };

  // Initialize form with values synchronized from Redux
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: getInitialValues(availProductTypes),
  });

  // Watch form fields for dynamic UI updates
  const formFields = watch();

  // Sync form when Redux appliedFilters updates (e.g. cleared externally)
  useEffect(() => {
    reset(getInitialValues(availProductTypes));
  }, [appliedFilters, reset, availProductTypes]);

  // Dynamically update available filters based on current category
  useEffect(() => {
    const currProductTypes = ["All"];

    switch (currCategory) {
      case "comics":
        currProductTypes.push(
          "Action",
          "Adventure",
          "Comedy",
          "Drama",
          "Fantasy",
        );
        break;
      case "clothes":
        currProductTypes.push("T-Shirt", "Jacket", "Pants");
        break;
      case "shoes":
        currProductTypes.push("Sneakers", "Boots");
        break;
      case "toys":
        currProductTypes.push("Action-Figure", "Car", "Doll");
        break;
      default:
        break;
    }

    setAvailProductTypes(currProductTypes);
  }, [currCategory]);

  // Handle Type/Genre Checkbox Click
  const handleTypeClick = (filter) => {
    const currentSelected = formFields.productTypes || ["All"];
    let updated;
    if (filter === "All") {
      updated = ["All"];
    } else {
      if (currentSelected.includes(filter)) {
        updated = currentSelected.filter((t) => t !== filter);
        if (updated.length === 0) {
          updated = ["All"];
        }
      } else {
        updated = currentSelected.filter((t) => t !== "All").concat(filter);
      }
    }
    setValue("productTypes", updated, { shouldDirty: true, shouldTouch: true });
  };

  // Price calculations
  const currentPrice =
    formFields.price !== undefined && formFields.price !== null
      ? Number(formFields.price)
      : 100;
  const isAllPrices = currentPrice >= 100;

  // Custom background styling for range input based on current price
  const getBackgroundStyle = (value) => {
    const clamped = Math.min(Math.max(value, 0), 100);
    return {
      background: `linear-gradient(to right, #EAB308 ${clamped}%, rgba(255, 255, 255, 0.1) ${clamped}%)`,
    };
  };

  // Check if any filter is actively applied in Redux (used to show/hide Reset Filters)
  const hasActiveFilters = Boolean(
    (appliedFilters?.searchQuery && appliedFilters.searchQuery.trim() !== "") ||
    (appliedFilters?.price &&
      Number(appliedFilters.price) > 0 &&
      Number(appliedFilters.price) < 100) ||
    (appliedFilters?.productTypes &&
      Array.isArray(appliedFilters.productTypes) &&
      appliedFilters.productTypes.some(
        (t) => t && t.toLowerCase() !== "all",
      )) ||
    (appliedFilters?.sortBy && appliedFilters.sortBy.toLowerCase() !== "popular"),
  );

  // Check if current form inputs differ from applied filters (uncommitted changes)
  const hasUncommittedChanges = useMemo(() => {
    // 1. Search Query
    const currentQuery = (formFields.searchQuery || "").trim();
    const appliedQuery = (appliedFilters?.searchQuery || "").trim();
    const isSearchQueryChanged = currentQuery !== appliedQuery;

    // 2. Sort By
    const currentSort = (formFields.sortBy || "popular").toLowerCase();
    const appliedSort = (appliedFilters?.sortBy || "popular").toLowerCase();
    const isSortByChanged = currentSort !== appliedSort;

    // 3. Price (normalized: 0 or >=100 is unconstrained)
    const normalizePrice = (val) => {
      const num = Number(val);
      if (isNaN(num) || num >= 100 || num <= 0) return 0;
      return num;
    };
    const currentPriceNorm = normalizePrice(formFields.price);
    const appliedPriceNorm = normalizePrice(appliedFilters?.price);
    const isPriceChanged = currentPriceNorm !== appliedPriceNorm;

    // 4. Product Types
    const normalizeTypes = (types) => {
      if (!Array.isArray(types)) return [];
      const clean = types
        .map((t) => String(t).toLowerCase().trim())
        .filter((t) => t && t !== "all");
      return Array.from(new Set(clean)).sort();
    };
    const currentTypesNorm = normalizeTypes(formFields.productTypes);
    const appliedTypesNorm = normalizeTypes(appliedFilters?.productTypes);
    const isTypesChanged =
      JSON.stringify(currentTypesNorm) !== JSON.stringify(appliedTypesNorm);

    return (
      isSearchQueryChanged ||
      isSortByChanged ||
      isPriceChanged ||
      isTypesChanged
    );
  }, [
    formFields.searchQuery,
    formFields.sortBy,
    formFields.price,
    formFields.productTypes,
    appliedFilters,
  ]);

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const rawPrice = Number(data.price);
      // Normalized price: if 100 or <= 0, treat as unconstrained (0 on backend)
      const normalizedPrice =
        isNaN(rawPrice) || rawPrice >= 100 || rawPrice <= 0 ? 0 : rawPrice;

      const formData = {
        productTypes:
          data.productTypes?.map((filter) => filter.toLowerCase()) || ["all"],
        sortBy: data.sortBy?.toLowerCase() || "popular",
        price: normalizedPrice,
        searchQuery: data.searchQuery?.trim() || "",
      };

      // Reset to page 1 whenever filters change
      dispatch(updateCurrPage(1));

      // Update Redux store
      dispatch(transferFilterData(formData));

      // Auto-close filter bar on mobile/tablet drawer
      dispatch(openFilterBar(false));
      // Clear cached products to trigger fresh fetch
      dispatch(setProductsCache([]));
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-[280px] h-[820px] max-h-[calc(100vh-52px)] md:max-h-[calc(100vh-64px)] lg:h-full bg-zinc-950 p-6 shadow-2xl border border-white/10 rounded-r-sm overflow-y-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Mobile close button */}
        <div className="flex items-center justify-end lg:hidden">
          <img
            src={assets.close}
            alt="close"
            className="w-8 transition-opacity cursor-pointer hover:opacity-75"
            onClick={() => dispatch(openFilterBar(!barState))}
          />
        </div>

        {/* Product Nav above search input on desktop */}
        <div className="justify-center hidden pt-4 lg:flex">
          <ProductNav />
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 outline-none text-white placeholder:text-white/60 focus:border-yellow-500/50 transition-all duration-300 text-sm"
            {...register("searchQuery", {
              minLength: {
                value: 2,
                message: "Search query must be at least 2 characters",
              },
            })}
          />
          <button
            type="submit"
            disabled={!hasUncommittedChanges || isSubmitting}
            className={`absolute transition-all -translate-y-1/2 right-3 top-1/2 ${
              !hasUncommittedChanges || isSubmitting
                ? "opacity-30 cursor-not-allowed"
                : "opacity-75 hover:opacity-100 cursor-pointer"
            }`}
          >
            <img src={assets.search} className="w-5 h-5" alt="search" />
          </button>
          {errors.searchQuery && (
            <span className="block mt-1 text-xs text-pink-500">
              {errors.searchQuery.message}
            </span>
          )}
        </div>

        {/* Filters section */}
        <div>
          <h3 className="flex items-center gap-2 mb-3 text-base font-semibold text-white/90">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
            Available Filters
          </h3>
          <div className="grid grid-cols-2 gap-3 text-white/70">
            {availProductTypes.map((filter) => {
              const isChecked = (formFields.productTypes || ["All"]).includes(
                filter,
              );
              return (
                <label
                  key={filter}
                  className="flex items-center gap-2 text-sm transition-colors duration-200 cursor-pointer hover:text-yellow-500 group"
                >
                  <input
                    type="checkbox"
                    value={filter}
                    checked={isChecked}
                    onChange={() => handleTypeClick(filter)}
                    className="flex-shrink-0 w-4 h-4 cursor-pointer accent-yellow-500 border-white/20 focus:ring-yellow-500 focus:ring-offset-1 focus:ring-offset-black"
                  />
                  <span className="text-xs transition-transform duration-200 group-hover:translate-x-1">
                    {filter}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Price range selector */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white/90">
              <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
              Price Range
            </h3>
            {!isAllPrices && (
              <button
                type="button"
                onClick={() =>
                  setValue("price", 100, {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
                className="font-mono text-xs text-yellow-500 transition-colors cursor-pointer hover:text-yellow-400"
              >
                Reset
              </button>
            )}
          </div>
          <div className="px-2">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={currentPrice}
              onChange={(e) =>
                setValue("price", Number(e.target.value), {
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
              style={getBackgroundStyle(currentPrice)}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
            <div className="flex justify-between mt-2 font-mono text-xs text-white/70">
              <span>$0</span>
              <span className="font-semibold text-yellow-500">
                {isAllPrices
                  ? "All Prices"
                  : `Up to $${formatPrice(currentPrice)}`}
              </span>
              <span>$100</span>
            </div>
          </div>
        </div>

        {/* Sort options */}
        <div>
          <h3 className="flex items-center gap-2 mb-3 text-base font-semibold text-white/90">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
            Sort By
          </h3>
          <select
            {...register("sortBy")}
            className="w-full bg-white/10 text-white/70 p-2.5 rounded-lg border border-white/20 outline-none focus:border-yellow-500/50 transition-all duration-300 text-sm cursor-pointer hover:bg-white/15"
          >
            <option value="popular" className="bg-black">
              Most Popular
            </option>
            <option value="price-low" className="bg-black">
              Price: Low to High
            </option>
            <option value="price-high" className="bg-black">
              Price: High to Low
            </option>
          </select>
        </div>

        {/* Action Buttons: Apply & Clear/Reset Filters */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!hasUncommittedChanges || isSubmitting}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              isSubmitting
                ? "bg-zinc-800 text-zinc-400 border border-white/5 cursor-not-allowed select-none"
                : !hasUncommittedChanges
                  ? "bg-zinc-800/80 text-zinc-500 border border-white/5 opacity-60 cursor-not-allowed select-none"
                  : "bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-lg hover:shadow-yellow-500/25 active:scale-[0.98] cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <span>Applying...</span>
            ) : (
              <>
                <span>Apply Filters</span>
                <img
                  src={assets.funnel}
                  alt="funnel"
                  className={`w-4 h-4 transition-opacity duration-300 ${
                    !hasUncommittedChanges
                      ? "opacity-30 grayscale"
                      : "opacity-100"
                  }`}
                />
              </>
            )}
          </button>
          {hasActiveFilters && (
            <ClearFilterButton
              target="shop"
              className="py-3 px-3 h-[46px] w-[46px]"
              onReset={() => {
                reset({
                  productTypes: ["All"],
                  price: 100,
                  sortBy: "popular",
                  searchQuery: "",
                });
              }}
            />
          )}
        </div>
      </form>
    </div>
  );
};

export default FilterBar;
