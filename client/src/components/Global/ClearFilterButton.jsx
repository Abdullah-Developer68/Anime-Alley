import { useDispatch } from "react-redux";
import { RotateCcw } from "lucide-react";
import { resetProductFilters } from "../../redux/Slice/DashboardSlice";
import {
  transferFilterData,
  updateCurrPage,
  setProductsCache,
} from "../../redux/Slice/shopSlice";

const ClearFilterButton = ({
  target = "dashboard",
  onReset,
  className = "",
  title = "Reset Filters",
}) => {
  const dispatch = useDispatch();

  const handleClear = () => {
    if (target === "dashboard") {
      dispatch(resetProductFilters());
    } else if (target === "shop") {
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
    }

    if (onReset) {
      onReset();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClear}
      title={title}
      aria-label={title}
      className={`p-2.5 text-gray-400 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${className}`}
    >
      <RotateCcw className="w-4 h-4" />
    </button>
  );
};

export default ClearFilterButton;
