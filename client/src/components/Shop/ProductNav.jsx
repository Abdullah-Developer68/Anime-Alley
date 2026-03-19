import { useSelector, useDispatch } from "react-redux";
import { setCategory, openFilterBar } from "../../redux/Slice/shopSlice";
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
    <div className="px-4 py-3 bg-black rounded-full shadow-lg w-fit h-fit">
      <div className="flex items-center gap-3">
        {productCategories.map((category) => (
          <div
            key={category.name}
            className={`group relative flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all duration-300 ${
              currCategory === category.name ? "bg-yellow-500" : "bg-gray-500"
            }`}
            onClick={() => dispatch(setCategory(category.name))}
          >
            <img src={category.icon} alt={category.name} className="w-8 h-8" />
            {/* Hover Tooltip */}
            <div className="absolute z-50 invisible px-3 py-1 text-sm text-black transition-all duration-300 -translate-x-1/2 bg-white rounded-lg opacity-0 -top-14 left-1/2 whitespace-nowrap group-hover:opacity-100 group-hover:visible">
              {category.name.toUpperCase()}
              {/* Triangle pointer */}
              <div className="absolute w-2 h-2 rotate-45 -translate-x-1/2 -bottom-1 left-1/2 bg-black/90"></div>
            </div>
          </div>
        ))}
        {/* Filter Icon */}
        <div
          className="relative cursor-pointer xl:hidden group"
          onClick={() => {
            dispatch(openFilterBar(!barState));
          }}
        >
          <img src={assets.filter} alt="filter" className="w-10" />
          {/* Hover Tooltip */}
          <div className="absolute z-50 invisible px-3 py-1 text-sm text-black transition-all duration-300 -translate-x-1/2 bg-red-500 rounded-lg opacity-0 -top-14 left-1/2 whitespace-nowrap group-hover:opacity-100 group-hover:visible">
            Filters
            {/* Triangle pointer */}
            <div className="absolute w-2 h-2 rotate-45 -translate-x-1/2 -bottom-1 left-1/2 bg-black/90"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductNav;
