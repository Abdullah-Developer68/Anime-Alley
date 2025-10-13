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
        <div className="flex flex-col justify-center items-center w-full">
          <div className="mt-10 mb-5">
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
