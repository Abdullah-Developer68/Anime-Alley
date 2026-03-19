import { useDispatch, useSelector } from "react-redux";
import { updateCurrPage } from "../../redux/Slice/shopSlice";
import assets from "../../assets/asset";

const Pagination = () => {
  const dispatch = useDispatch();
  const totalPages = useSelector((state) => state.shop.totalPages);
  const currentPage = useSelector((state) => state.shop.currPage);

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages && i <= 3; i++) {
      pages.push(
        <button
          key={i}
          className={`h-8 w-8 mx-1 flex items-center justify-center rounded-full ${
            currentPage === i
              ? "bg-white text-black cursor-pointer"
              : "bg-gray-600 text-white hover:bg-gray-500 cursor-pointer"
          } transition-colors duration-300 text-sm font-medium`}
          onClick={() => dispatch(updateCurrPage(i))}
        >
          {i}
        </button>,
      );
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center my-8">
      <button
        className="flex items-center justify-center h-8 px-4 ml-2 transition-colors bg-gray-300 border-gray-300 rounded-full cursor-pointer hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={currentPage === 1}
        onClick={() => dispatch(updateCurrPage(currentPage - 1))}
      >
        <img src={assets.prevBtn} alt="Previous" className="w-4 h-4" />
      </button>

      <div className="flex items-center">{renderPageNumbers()}</div>

      <button
        className="flex items-center justify-center h-8 px-4 ml-2 transition-colors bg-gray-300 border-gray-300 rounded-full cursor-pointer hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={currentPage === totalPages}
        onClick={() => dispatch(updateCurrPage(currentPage + 1))}
      >
        <img src={assets.nextBtn} alt="Next" className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
