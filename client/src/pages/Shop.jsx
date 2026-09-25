import FilterBar from "../components/Shop/FilterBar";
import ProductNav from "../components/Shop/ProductNav";
import ProductGrid from "../components/Shop/ProductGrid";
import Pagination from "../components/Shop/Pagination";
import { useSelector } from "react-redux";

const Shop = () => {
  const openFilterBar = useSelector((state) => state.shop.openFilterBar);
  return (
    <>
      {/* Main Content */}
      <div className="flex mt-[63px]">
        <div
          className={`absolute ${
            openFilterBar ? "left-0" : "-left-72"
          } lg:relative lg:left-0 transition-all duration-200 z-40`}
        >
          <FilterBar />
        </div>
        <div className="flex flex-col items-center justify-between w-full min-w-0 px-2 lg:px-4">
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
