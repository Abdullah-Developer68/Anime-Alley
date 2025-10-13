import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import {
  openFilterBar,
  transferFilterData,
  updateCurrPage,
} from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";
import { useState, useEffect } from "react";

const FilterBar = () => {
  // Initialize form with default values
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      productTypes: ["All"],
      currProductType: "All",
      price: 0,
      sortBy: "popular",
      searchQuery: "",
    },
  });

  // Redux state hooks
  const currCategory = useSelector((state) => state.shop.currCategory);
  const barState = useSelector((state) => state.shop.openFilterBar);
  const dispatch = useDispatch();

  // Local component state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availProductTypes, setAvailProductTypes] = useState([]);

  // Watch form fields for changes
  const formFields = watch();

  //  Dynamically update available filters based on current category.
  useEffect(() => {
    const currProductTypes = ["All"];

    switch (currCategory) {
      case "comics":
        currProductTypes.push(
          "Action",
          "Adventure",
          "Comedy",
          "Drama",
          "Fantasy"
        );
        break;
      case "action figures":
        currProductTypes.push("Action Figure", "Vehicle", "Puzzle");
        break;
      case "clothes":
        currProductTypes.push("T-Shirts", "Jackets", "Pants");
        break;
      case "shoes":
        currProductTypes.push("Sneakers", "Boots");
        break;
      case "toys":
        currProductTypes.push("Action Figures", "Dolls", "Cars");
        break;
      default:
        break;
    }

    setAvailProductTypes(currProductTypes);
  }, [currCategory]);

  /**
   * Automatically deselect "All" when other filters are active
   * to avoid conflicting intent and vice versa
   */
  useEffect(() => {
    let updatedFilters;

    if (formFields.currProductType === "All") {
      updatedFilters = formFields.productTypes.filter((filter) => {
        return filter === "All";
      });
    } else {
      updatedFilters = formFields.productTypes.filter((filter) => {
        return filter !== "All";
      });
    }

    setValue("productTypes", updatedFilters);
  }, [formFields.currProductType]);

  /**
   * Form submission handler
   * Sends the selected filters, price, sort, and query to the store.
   */
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const formData = {
        productTypes: data.productTypes?.map((filter) =>
          filter.toLowerCase()
        ) || ["all"],
        sortBy: data.sortBy?.toLowerCase() || "popular",
        price: data.price || 0,
        searchQuery: data.searchQuery?.trim() || "",
      };

      // Reset to page 1 if search was used
      if (formFields.searchQuery) {
        dispatch(updateCurrPage(1));
      }

      // Only transfer data if filters are actually applied
      if (
        formData.price > 0 ||
        formData.productTypes.length > 0 ||
        formData.searchQuery ||
        formData.sortBy !== "popular"
      ) {
        dispatch(transferFilterData(formData));
      }

      // Auto-close the filter bar after applying filters (similar to close button behavior)
      dispatch(openFilterBar(false));
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Custom background styling for range input based on current price
   */
  const getBackgroundStyle = (value) => {
    const percentage = (value / 100) * 100;
    return {
      background: `linear-gradient(to right, #EAB308 ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%)`,
    };
  };

  const updateCurrProductType = (filter) => {
    setValue("currProductType", filter);
  };

  return (
    <div className="w-[280px] h-[820px] lg:h-[900px] bg-black/95 backdrop-blur-sm p-6 shadow-xl border border-white/10 rounded-r-lg overflow-y-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Filter header with close icon */}
        <div className="flex justify-between items-center">
          <h3 className="text-white/90 font-semibold text-lg flex items-center gap-2">
            <span className="w-1 h-5 bg-yellow-500 rounded-full"></span>
            Filters
          </h3>
          <img
            src={assets.close}
            alt="close"
            className="w-8 cursor-pointer lg:hidden hover:opacity-75 transition-opacity"
            onClick={() => dispatch(openFilterBar(!barState))}
          />
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
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75 transition-opacity"
          >
            <img src={assets.search} className="w-5 h-5" alt="search" />
          </button>
          {errors.searchQuery && (
            <span className="text-pink-500 text-xs mt-1 block">
              {errors.searchQuery.message}
            </span>
          )}
        </div>

        {/* Filters section */}
        <div>
          <h3 className="text-white/90 font-semibold mb-4 text-base flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
            Available Filters
          </h3>
          <div className="grid grid-cols-2 gap-3 text-white/70">
            {availProductTypes.map((filter) => (
              <label
                key={filter}
                className="flex items-center gap-2 hover:text-yellow-500 cursor-pointer text-sm transition-colors duration-200 group"
              >
                <input
                  type="checkbox"
                  value={filter}
                  checked={watch("productTypes")?.includes(filter)}
                  {...register("productTypes")}
                  className="accent-yellow-500 w-4 h-4 border-white/20 focus:ring-yellow-500 focus:ring-offset-1 focus:ring-offset-black cursor-pointer flex-shrink-0"
                  onClick={() => {
                    updateCurrProductType(filter);
                  }}
                />
                <span className="group-hover:translate-x-1 transition-transform duration-200 text-xs">
                  {filter}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Price range selector */}
        <div>
          <h3 className="text-white/90 font-semibold mb-4 text-base flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
            Price Range
          </h3>
          <div className="relative px-2">
            <input
              type="range"
              min="0"
              max="100"
              {...register("price")}
              onChange={(e) => setValue("price", Number(e.target.value))}
              style={getBackgroundStyle(formFields.price)}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-white/70 text-sm">
              <span> 0 $</span>
              <span> {formFields.price} $</span>
              <span>100 $</span>
            </div>
          </div>
        </div>

        {/* Sort options */}
        <div>
          <h3 className="text-white/90 font-semibold mb-4 text-base flex items-center gap-2">
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
