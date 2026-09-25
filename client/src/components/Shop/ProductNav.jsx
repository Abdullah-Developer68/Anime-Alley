import { useSelector, useDispatch } from "react-redux";
import { setCategory, openFilterBar } from "../../redux/Slice/shopSlice";
import { updateCurrPage, setProductsCache } from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";

const ProductNav = () => {
  const productCategories = [
    { name: "comics", icon: assets.comics },
    { name: "toys", icon: assets.actionfigure },
    { name: "clothes", icon: assets.clothes },
    { name: "shoes", icon: assets.shoes },
  ];

  // for updating states in redux store
  const dispatch = useDispatch();
  const barState = useSelector((state) => state.shop.openFilterBar);
  const currCategory = useSelector((state) => state.shop.currCategory);

  return (
    <div className="p-1.5 bg-black/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 w-fit h-fit">
      <div className="flex items-center gap-1.5">
        {productCategories.map((category) => {
          const isActive = currCategory === category.name;
          return (
            <div
              key={category.name}
              className={`group relative flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-black shadow-[0_0_14px_rgba(245,158,11,0.45)] border border-yellow-300/60 scale-[1.04]"
                  : "bg-white/[0.05] hover:bg-white/[0.12] border border-white/5 hover:border-yellow-500/30 text-white/70 hover:text-white"
              }`}
              onClick={() => {
                dispatch(setCategory(category.name));
                dispatch(updateCurrPage(1));
                dispatch(setProductsCache([]));
              }}
            >
              <img
                src={category.icon}
                alt={category.name}
                className={`w-7 h-7 object-contain transition-transform duration-300 ${
                  isActive
                    ? "scale-105"
                    : "group-hover:scale-110 opacity-80 group-hover:opacity-100"
                }`}
              />
              {/* Tooltip on top */}
              <div className="absolute z-50 invisible px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white transition-all duration-200 -translate-x-1/2 bg-zinc-900/95 border border-white/10 rounded-md shadow-xl opacity-0 bottom-full mb-2.5 left-1/2 whitespace-nowrap group-hover:opacity-100 group-hover:visible pointer-events-none backdrop-blur-md">
                {category.name.toUpperCase()}
                {/* Triangle pointer */}
                <div className="absolute w-2 h-2 rotate-45 -translate-x-1/2 -bottom-1 left-1/2 bg-zinc-900 border-b border-r border-white/10"></div>
              </div>
            </div>
          );
        })}
        {/* Filter Icon - visible only on mobile/tablet */}
        <div
          className="relative cursor-pointer lg:hidden group flex items-center justify-center p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/5 hover:border-yellow-500/30 transition-all duration-300"
          onClick={() => {
            dispatch(openFilterBar(!barState));
          }}
        >
          <img
            src={assets.filter}
            alt="filter"
            className="w-7 h-7 object-contain opacity-80 group-hover:opacity-100 transition-transform duration-300 group-hover:scale-110"
          />
          {/* Tooltip on top */}
          <div className="absolute z-50 invisible px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white transition-all duration-200 -translate-x-1/2 bg-zinc-900/95 border border-white/10 rounded-md shadow-xl opacity-0 bottom-full mb-2.5 left-1/2 whitespace-nowrap group-hover:opacity-100 group-hover:visible pointer-events-none backdrop-blur-md">
            FILTERS
            {/* Triangle pointer */}
            <div className="absolute w-2 h-2 rotate-45 -translate-x-1/2 -bottom-1 left-1/2 bg-zinc-900 border-b border-r border-white/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductNav;
