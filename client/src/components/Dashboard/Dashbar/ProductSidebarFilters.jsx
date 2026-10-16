import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setProductFilters } from "../../../redux/Slice/DashboardSlice";
import { formatPrice } from "../../../utils/formatPrice";
import { Search } from "lucide-react";
import ClearFilterButton from "../../Global/ClearFilterButton";

const ProductSidebarFilters = () => {
  const dispatch = useDispatch();
  const productFilters = useSelector(
    (state) => state.dashboard.productFilters || {},
  );

  const [searchVal, setSearchVal] = useState(productFilters.searchQuery || "");
  const [priceVal, setPriceVal] = useState(productFilters.price || 0);
  const [selectedCategory, setSelectedCategory] = useState(
    productFilters.category || "comics",
  );
  const [selectedTypes, setSelectedTypes] = useState(
    productFilters.productTypes || ["all"],
  );

  // Synchronize internal state when Redux changes externally
  useEffect(() => {
    setSearchVal(productFilters.searchQuery || "");
    setPriceVal(productFilters.price || 0);
    setSelectedCategory(productFilters.category || "comics");
    setSelectedTypes(productFilters.productTypes || ["all"]);
  }, [
    productFilters.searchQuery,
    productFilters.price,
    productFilters.category,
    productFilters.productTypes,
  ]);

  // Determine available product types for current category
  const getProductTypes = (category) => {
    const list = ["All"];
    switch (category) {
      case "comics":
        return list.concat(["Action", "Adventure", "Comedy", "Drama", "Fantasy"]);
      case "clothes":
        return list.concat(["T-Shirt", "Jacket", "Pants"]);
      case "shoes":
        return list.concat(["Sneakers", "Boots"]);
      case "toys":
        return list.concat(["Action-Figure", "Car", "Doll"]);
      default:
        return list;
    }
  };

  const availTypes = getProductTypes(selectedCategory);

  // Handle Category Change
  const handleCategoryChange = (newCat) => {
    setSelectedCategory(newCat);
    const defaultTypes = ["all"];
    setSelectedTypes(defaultTypes);
    dispatch(
      setProductFilters({
        category: newCat,
        productTypes: defaultTypes,
        searchQuery: searchVal.trim(),
        price: Number(priceVal) || 0,
      }),
    );
  };

  // Handle Type/Genre Checkbox Click
  const handleTypeClick = (item) => {
    let newTypes;
    if (item === "All") {
      newTypes = ["all"];
    } else {
      const lower = item.toLowerCase();
      if (selectedTypes.includes(lower)) {
        newTypes = selectedTypes.filter((t) => t !== lower);
        if (newTypes.length === 0) {
          newTypes = ["all"];
        }
      } else {
        newTypes = selectedTypes
          .filter((t) => t !== "all")
          .concat(lower);
      }
    }
    setSelectedTypes(newTypes);
  };

  // Check if any filter is actively applied in Redux
  const hasActiveFilters = Boolean(
    (productFilters.searchQuery && productFilters.searchQuery.trim() !== "") ||
    (productFilters.price && Number(productFilters.price) > 0) ||
    (productFilters.productTypes &&
      productFilters.productTypes.length > 0 &&
      productFilters.productTypes.some((t) => t && t.toLowerCase() !== "all")) ||
    (productFilters.category && productFilters.category !== "comics")
  );

  // Check if current form inputs differ from applied filters (uncommitted changes)
  const hasUncommittedChanges = useMemo(() => {
    // Search
    if ((searchVal || "").trim() !== (productFilters.searchQuery || "").trim()) {
      return true;
    }
    // Price
    if (Number(priceVal || 0) !== Number(productFilters.price || 0)) {
      return true;
    }
    // Category
    if (selectedCategory !== (productFilters.category || "comics")) {
      return true;
    }
    // Types
    const normalizeTypes = (types) => {
      if (!Array.isArray(types)) return [];
      return types
        .map((t) => String(t).toLowerCase().trim())
        .filter((t) => t && t !== "all")
        .sort();
    };
    if (
      JSON.stringify(normalizeTypes(selectedTypes)) !==
      JSON.stringify(normalizeTypes(productFilters.productTypes))
    ) {
      return true;
    }
    return false;
  }, [searchVal, priceVal, selectedCategory, selectedTypes, productFilters]);

  // Submit / Apply all filters
  const handleApply = (e) => {
    if (e) e.preventDefault();
    dispatch(
      setProductFilters({
        searchQuery: searchVal.trim(),
        category: selectedCategory,
        price: Number(priceVal) || 0,
        productTypes: selectedTypes,
      }),
    );
  };

  const getBackgroundStyle = (val) => {
    const max = productFilters.maxPrice || 100;
    const percentage = (val / max) * 100;
    return {
      background: `linear-gradient(to right, #EC4899 ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%)`,
    };
  };

  return (
    <form onSubmit={handleApply} className="space-y-5">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search products..."
          className="w-full px-3.5 py-2 text-xs text-white rounded-lg outline-none bg-white/10 border border-white/20 placeholder:text-white/60 focus:border-pink-500/60 transition-all duration-300"
        />
        <button
          type="submit"
          disabled={!hasUncommittedChanges}
          className={`absolute -translate-y-1/2 right-3 top-1/2 transition-opacity ${
            !hasUncommittedChanges
              ? "opacity-30 cursor-not-allowed text-white/40"
              : "opacity-75 hover:opacity-100 cursor-pointer text-white/70 hover:text-white"
          }`}
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Category Dropdown */}
      <div>
        <h3 className="flex items-center gap-2 mb-2 text-xs font-semibold text-white/90">
          <span className="w-1 h-3.5 bg-pink-500 rounded-full"></span>
          Category
        </h3>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full p-2 text-xs text-white/90 rounded-lg cursor-pointer bg-white/10 border border-white/20 outline-none focus:border-pink-500/60 transition-all duration-300 hover:bg-white/15"
        >
          <option className="text-black bg-white" value="comics">
            Comics
          </option>
          <option className="text-black bg-white" value="clothes">
            Clothes
          </option>
          <option className="text-black bg-white" value="shoes">
            Shoes
          </option>
          <option className="text-black bg-white" value="toys">
            Toys
          </option>
        </select>
      </div>

      {/* Price Range Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <span className="w-1 h-3.5 bg-pink-500 rounded-full"></span>
            Price Range
          </h3>
          {priceVal > 0 && (
            <button
              type="button"
              onClick={() => setPriceVal(0)}
              className="font-mono text-[11px] text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="px-1">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={priceVal}
            onChange={(e) => setPriceVal(Number(e.target.value))}
            style={getBackgroundStyle(priceVal)}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white"
          />
          <div className="flex justify-between mt-1.5 font-mono text-[11px] text-white/70">
            <span>$0</span>
            <span className="font-semibold text-pink-400">
              {priceVal === 0 ? "All Prices" : `Up to $${formatPrice(priceVal)}`}
            </span>
            <span>$100</span>
          </div>
        </div>
      </div>

      {/* Available Filters Section */}
      <div>
        <h3 className="flex items-center gap-2 mb-2 text-xs font-semibold text-white/90">
          <span className="w-1 h-3.5 bg-pink-500 rounded-full"></span>
          {selectedCategory === "clothes"
            ? "Available Clothes"
            : selectedCategory === "shoes"
              ? "Available Shoes"
              : selectedCategory === "comics"
                ? "Available Genres"
                : "Available Toys"}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-white/70 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {availTypes.map((item) => {
            const isChecked = selectedTypes.includes(item.toLowerCase());
            return (
              <label
                key={item}
                className="flex items-center gap-2 text-xs transition-colors duration-200 cursor-pointer hover:text-pink-400 group"
              >
                <input
                  type="checkbox"
                  value={item}
                  checked={isChecked}
                  onChange={() => handleTypeClick(item)}
                  className="flex-shrink-0 w-3.5 h-3.5 cursor-pointer accent-pink-500 border-white/20 focus:ring-pink-500 focus:ring-offset-1 focus:ring-offset-black"
                />
                <span className="text-[11px] transition-transform duration-200 group-hover:translate-x-1">
                  {item}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Apply and Clear/Reset Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!hasUncommittedChanges}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
            !hasUncommittedChanges
              ? "bg-zinc-800 text-zinc-500 border border-white/5 opacity-60 cursor-not-allowed select-none"
              : "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg hover:shadow-pink-500/25 cursor-pointer active:scale-[0.98]"
          }`}
        >
          Apply Filters
        </button>
        {hasActiveFilters && (
          <ClearFilterButton
            target="dashboard"
            className="py-1.5 px-2 h-[32px] w-[32px]"
            onReset={() => {
              setSearchVal("");
              setPriceVal(0);
              setSelectedCategory("comics");
              setSelectedTypes(["all"]);
            }}
          />
        )}
      </div>
    </form>
  );
};

export default ProductSidebarFilters;
