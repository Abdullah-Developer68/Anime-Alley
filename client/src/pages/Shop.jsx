import { useEffect } from "react";
import FilterBar from "../components/Shop/FilterBar";
import ProductNav from "../components/Shop/ProductNav";
import ProductGrid from "../components/Shop/ProductGrid";
import Pagination from "../components/Shop/Pagination";
import { useSelector } from "react-redux";

const Shop = () => {
  const openFilterBar = useSelector((state) => state.shop.openFilterBar);

  // Prevent background scrolling when filter drawer is open on mobile
  useEffect(() => {
    if (openFilterBar) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [openFilterBar]);

  return (
    <>
      {/* Main Content */}
      <div className="flex mt-[63px] lg:h-[calc(100vh-63px)] lg:overflow-hidden">
        <div
          className={`fixed top-[63px] left-0 ${
            openFilterBar ? "translate-x-0" : "-translate-x-full"
          } lg:relative lg:top-auto lg:left-0 lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:h-full max-h-[calc(100vh-63px)] will-change-transform`}
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
