import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setReloadData,
  openProductDeleteModal,
  openProductForm,
  openExportModal,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import assets from "../../../../assets/asset";
import ProductForm from "./ProductForm";
import DeleteProduct from "./DeleteProduct";
import { formatPrice } from "../../../../utils/formatPrice";
import { Plus, Download } from "lucide-react";

const ProductCatalog = () => {
  // states
  const [products, setProducts] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);

  // redux
  const {
    reloadData,
    productDeleteModalState,
    productFormState,
    productFilters,
  } = useSelector((state) => state.dashboard);

  const dispatch = useDispatch();

  // Load products based on Redux productFilters and current page
  const loadProducts = useCallback(async () => {
    setLoading(true);
    const activeFilters = productFilters || {};
    const payload = {
      category: (activeFilters.category || "comics").toLowerCase(),
      productTypes:
        activeFilters.productTypes && activeFilters.productTypes.length
          ? activeFilters.productTypes.map((type) => type.toLowerCase())
          : ["all"],
      price: Number(activeFilters.price) || 0,
      sortBy: activeFilters.sortBy || "popular",
      page: currPage,
      searchQuery: (activeFilters.searchQuery || "").trim(),
    };

    try {
      const response = await api.getProducts(payload);
      if (response.data.success) {
        setProducts(response.data.currPageProducts);
        setTotalPages(response.data.totalPages);
        setTotalProducts(response.data.totalProducts);
      }
    } catch (error) {
      console.error("Error loading products:", {
        message: error.message,
        response: error.response?.data,
        payload,
      });
    } finally {
      setLoading(false);
    }
  }, [productFilters, currPage]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrPage(1);
  }, [
    productFilters?.category,
    productFilters?.searchQuery,
    productFilters?.price,
    productFilters?.productTypes,
    productFilters?.filterVersion,
  ]);

  // Fetch products on mount and when loadProducts changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reloads products when productReload is triggered via Redux
  useEffect(() => {
    if (reloadData === "products") {
      loadProducts().then(() => {
        dispatch(setReloadData(null));
      });
    }
  }, [reloadData, dispatch, loadProducts]);

  // Pagination handler
  const handlePg = (value) => {
    let newPage;
    if (value === "next" && currPage < totalPages) {
      newPage = currPage + 1;
    } else if (value === "prev" && currPage > 1) {
      newPage = currPage - 1;
    } else if (typeof value === "number") {
      newPage = value;
    } else {
      return;
    }
    setCurrPage(newPage);
  };

  const handleDeleteModal = (product) => {
    dispatch(openProductDeleteModal(product));
  };

  const openForm = (product) => {
    dispatch(openProductForm(product ? product : null));
  };

  return (
    <div className="p-6 space-y-4">
      {productFormState.isOpen && <ProductForm />}

      <div className="flex items-center justify-end gap-2 pb-1">
        <button
          type="button"
          onClick={() => dispatch(openExportModal("products"))}
          title="Export Products"
          className="flex items-center justify-center p-2 text-black transition-colors bg-gray-300 rounded-lg cursor-pointer hover:bg-white"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => openForm()}
          title="Add New Product"
          className="flex items-center justify-center p-2 text-white transition-colors bg-pink-500 rounded-lg cursor-pointer hover:bg-pink-600"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="border bg-white/5 rounded-xl border-white/10">
        <div className="relative overflow-auto h-[620px] max-h-[calc(100vh-220px)] min-h-[500px]">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-black/50 backdrop-blur-sm">
              <tr className="border-b border-white/10">
                <th
                  scope="col"
                  className="w-[15%] px-6 py-4 text-left text-sm font-medium text-gray-400"
                >
                  Actions
                </th>
                <th
                  scope="col"
                  className="w-[25%] px-6 py-4 text-left text-sm font-medium text-gray-400"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="w-[15%] px-6 py-4 text-left text-sm font-medium text-gray-400"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="w-[15%] px-6 py-4 text-left text-sm font-medium text-gray-400"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="w-[30%] px-6 py-4 text-left text-sm font-medium text-gray-400"
                >
                  Stock Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr
                    key={index}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <div className="flex justify-start gap-2">
                        <button
                          className="flex items-center justify-center w-10 h-10 p-2 transition-colors bg-gray-300 rounded-lg hover:bg-white group"
                          title="Edit"
                          onClick={() => {
                            openForm(product);
                          }}
                        >
                          <img
                            src={assets.edit}
                            className="w-5 h-5 cursor-pointer"
                            alt="Edit"
                          />
                        </button>
                        <button
                          className="flex items-center justify-center w-10 h-10 p-2 transition-colors bg-gray-300 rounded-lg cursor-pointer hover:bg-white group"
                          title="Delete"
                          onClick={() => {
                            handleDeleteModal(product);
                          }}
                        >
                          <img
                            src={assets.deleteIcon}
                            className="w-5 h-5 cursor-pointer"
                            alt="Delete"
                          />
                        </button>

                        {productDeleteModalState.isOpen && <DeleteProduct />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="object-cover w-10 h-10 rounded-lg bg-white/5"
                        />
                        <div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            ID: #{product.productID}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-medium text-pink-500 rounded-full bg-pink-500/20">
                        {product.category.charAt(0).toUpperCase() +
                          product.category.slice(1)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-white">
                        {formatPrice(product.price)} $
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="max-h-[56px] overflow-y-auto flex flex-col gap-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {Array.isArray(product.variants) &&
                        product.variants.length === 1 &&
                        product.variants[0].label === "Default" ? (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${
                              product.variants[0].stock > 0
                                ? "bg-green-500/20 text-green-500"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {product.variants[0].stock > 0
                              ? `${product.variants[0].stock} available`
                              : "Out of Stock"}
                          </span>
                        ) : (
                          (product.variants || []).map((v) => (
                            <span
                              key={v.label}
                              className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                                v.stock > 0
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {product.category === "comics" &&
                              !v.label.startsWith("V")
                                ? "Vol. "
                                : ""}
                              {v.label}: {v.stock > 0 ? v.stock : "Out"}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {products.length > 0
            ? `Showing ${(currPage - 1) * 20 + 1} to ${
                (currPage - 1) * 20 + products.length
              } of ${totalProducts} products`
            : "No products found"}
        </p>
        <div className="flex gap-2">
          <button
            className={`cursor-pointer px-3 py-1 rounded-lg ${
              currPage === 1
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-white/5 text-white hover:bg-white/10"
            } transition-colors`}
            onClick={() => handlePg("prev")}
            disabled={currPage === 1}
          >
            Previous
          </button>
          {totalPages > 0 &&
            [...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                className={`px-3 py-1 rounded-lg ${
                  currPage === index + 1
                    ? "text-black bg-white"
                    : "text-white bg-gray-600 hover:bg-gray-500"
                } transition-colors`}
                onClick={() => handlePg(index + 1)}
              >
                {index + 1}
              </button>
            ))}
          <button
            className={`cursor-pointer px-3 py-1 rounded-lg ${
              currPage === totalPages
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-white/5 text-white hover:bg-white/10"
            } transition-colors`}
            onClick={() => handlePg("next")}
            disabled={currPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;
