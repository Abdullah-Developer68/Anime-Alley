import FilterBar from "../components/Shop/FilterBar";
import ProductNav from "../components/Shop/ProductNav";
import ProductGrid from "../components/Shop/ProductGrid";
import Pagination from "../components/Shop/Pagination";
import { useSelector, useDispatch } from "react-redux";
import { openFilterBar as setOpenFilterBar } from "../redux/Slice/shopSlice";

const Shop = () => {
  const dispatch = useDispatch();
  const isFilterBarOpen = useSelector((state) => state.shop.openFilterBar);

  return (
    <>
      {/* Invisible backdrop: Touching or clicking outside immediately closes the drawer without darkening the screen */}
      {isFilterBarOpen && (
        <div
          className="fixed inset-0 top-[52px] md:top-[64px] bg-transparent z-30 lg:hidden cursor-pointer"
          onClick={() => dispatch(setOpenFilterBar(false))}
        />
      )}

      {/* Main Content */}
      <div className="flex mt-[52px] md:mt-[64px] lg:h-[calc(100vh-64px)] lg:overflow-hidden">
        <div
          className={`fixed top-[52px] md:top-[64px] left-0 ${
            isFilterBarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:relative lg:top-auto lg:left-0 lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:h-full max-h-[calc(100vh-52px)] md:max-h-[calc(100vh-64px)] will-change-transform`}
        >
          <FilterBar />
        </div>
        <div className="flex flex-col items-center justify-between w-full min-w-0 px-2 lg:px-4 lg:h-full">
          {/* Standalone product nav on mobile and tablet */}
          <div className="mb-4 lg:hidden">
            <ProductNav />
          </div>
          <ProductGrid />
          <Pagination />
        </div>
      </div>
    </>
  );
};

export default Shop;
