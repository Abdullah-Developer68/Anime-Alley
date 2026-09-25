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
import { useState, useEffect } from "react";
import { formatPrice } from "../../utils/formatPrice";

const FilterBar = () => {
  // Redux state hooks
  const currCategory = useSelector((state) => state.shop.currCategory);
  const barState = useSelector((state) => state.shop.openFilterBar);
  const appliedFilters = useSelector((state) => state.shop.productTypes);
  const dispatch = useDispatch();

  // Helper to extract initial values from Redux state
  const getInitialValues = () => {
    const rawPrice = Number(appliedFilters?.price);
    const initialPrice =
      !isNaN(rawPrice) && rawPrice > 0 && rawPrice < 100 ? rawPrice : 100;
    const initialTypes =
      appliedFilters?.productTypes && appliedFilters.productTypes.length > 0
        ? appliedFilters.productTypes.map((t) =>
            t.toLowerCase() === "all"
              ? "All"
              : t.charAt(0).toUpperCase() + t.slice(1),
          )
        : ["All"];

    return {
      productTypes: initialTypes,
      currProductType: initialTypes[0] || "All",
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
    defaultValues: getInitialValues(),
  });

  // Local component state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availProductTypes, setAvailProductTypes] = useState([]);

  // Watch form fields for dynamic UI updates
  const formFields = watch();

  // Sync form when Redux appliedFilters updates (e.g. cleared externally)
  useEffect(() => {
    reset(getInitialValues());
  }, [appliedFilters, reset]);

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

  // Automatically deselect "All" when other filters are active and vice-versa
  useEffect(() => {
    let updatedFilters;

    if (formFields.currProductType === "All")
      updatedFilters = formFields.productTypes.filter(
        (filter) => filter === "All",
      );
    else
      updatedFilters = formFields.productTypes.filter(
        (filter) => filter !== "All",
      );

    const isDifferent =
      JSON.stringify(updatedFilters) !==
      JSON.stringify(formFields.productTypes);

    if (isDifferent) setValue("productTypes", updatedFilters);
  }, [formFields.currProductType, formFields.productTypes, setValue]);

  // Price calculations
  const currentPrice =
    formFields.price !== undefined && formFields.price !== null
      ? Number(formFields.price)
      : 100;
  const isAllPrices = currentPrice >= 100 || currentPrice <= 0;

  // Custom background styling for range input based on current price
  const getBackgroundStyle = (value) => {
    const num = Number(value);
    const clamped = isNaN(num) ? 100 : Math.max(0, Math.min(100, num));
    return {
      background: `linear-gradient(to right, #EAB308 ${clamped}%, rgba(255, 255, 255, 0.1) ${clamped}%)`,
    };
  };

  const updateCurrProductType = (filter) => {
    setValue("currProductType", filter);
  };

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
    <div className="w-[280px] h-full min-h-[calc(100vh-63px)] bg-black/95 backdrop-blur-sm p-6 shadow-xl border border-white/10 rounded-r-sm overflow-y-auto">
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
            className="absolute transition-opacity -translate-y-1/2 right-3 top-1/2 hover:opacity-75"
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
            {availProductTypes.map((filter) => (
              <label
                key={filter}
                className="flex items-center gap-2 text-sm transition-colors duration-200 cursor-pointer hover:text-yellow-500 group"
              >
                <input
                  type="checkbox"
                  value={filter}
                  checked={watch("productTypes")?.includes(filter)}
                  {...register("productTypes")}
                  className="flex-shrink-0 w-4 h-4 cursor-pointer accent-yellow-500 border-white/20 focus:ring-yellow-500 focus:ring-offset-1 focus:ring-offset-black"
                  onClick={() => {
                    updateCurrProductType(filter);
                  }}
                />
                <span className="text-xs transition-transform duration-200 group-hover:translate-x-1">
                  {filter}
                </span>
              </label>
            ))}
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

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
            isSubmitting
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-lg hover:shadow-yellow-500/25"
          }`}
        >
          {isSubmitting ? (
            <span>Applying...</span>
          ) : (
            <>
              <span>Apply Filters</span>
              <img src={assets.funnel} alt="funnel" className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default FilterBar;
