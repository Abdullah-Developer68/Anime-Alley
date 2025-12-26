import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useCallback } from "react";

const ProductCatalog = () => {
  // base URL for images from server

  // react hook form setup
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      category: "comics",
      price: 0,
      sortBy: "popular",
      searchQuery: "",
      minPrice: 0,
      maxPrice: 100, // max price is 100 for the range input
      currProductType: "All",
      productTypes: ["all"], // default to "all" for product types
    },
  });

  // Watch form fields for changes
  const formFields = watch();

  // states
  const [products, setProducts] = useState([]);
  const [availProductTypes, setAvailProductTypes] = useState(["All"]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiPayload, setApiPayload] = useState({
    category: "comics",
    productTypes: ["all"],
    price: 0,
    sortBy: "popular",
    page: currPage,
    searchQuery: "",
  });

  // redux
  const { reloadData, productDeleteModalState, productFormState } = useSelector(
    (state) => state.dashboard,
  );

  const dispatch = useDispatch();

  //deselects "All" when other filters are active
  useEffect(() => {
    let updatedProductTypes;

    if (formFields.currProductType === "All") {
      updatedProductTypes = ["all"];
    } else {
      updatedProductTypes = formFields.productTypes.filter((filter) => {
        return filter !== "All";
      });
    }

    setValue("productTypes", updatedProductTypes);
  }, [formFields.currProductType, setValue, formFields.productTypes]);

  //  Dynamically update available filters based on current category.
  useEffect(() => {
    const currProductTypes = ["All"];

    switch (formFields.category) {
      case "comics":
        currProductTypes.push(
          "Action",
          "Adventure",
          "Comedy",
          "Drama",
          "Fantasy",
        );
        break;
      case "clothes":
        currProductTypes.push("T-Shirt", "Jacket", "Pants");
        break;
      case "shoes":
        currProductTypes.push("Sneakers", "Boots");
        break;
      case "toys":
        currProductTypes.push("Action-Figure", "Car");
        break;
      default:
        break;
    }
    setAvailProductTypes(currProductTypes);
  }, [formFields.category]);

  // Initial API payload setup
  const onSubmit = async (data) => {
    setCurrPage(1); // Reset to page 1 when filters are changed
    const newPayload = {
      category: data.category.toLowerCase(),
      productTypes: formFields.productTypes.length
        ? formFields.productTypes.map((type) => type.toLowerCase())
        : ["all"],
      price: Number(data.price) || 0,
      sortBy: data.sortBy || "popular",
      page: currPage,
      searchQuery: data.searchQuery?.trim() || "",
    };

    setApiPayload(newPayload);
  };

  // This changes the reference of the function on currPage, and apiPayload
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getProducts(apiPayload);
      if (response.data.success) {
        // Update products and total pages from the response
        setProducts(response.data.currPageProducts);
        setTotalPages(response.data.totalPages);
        setTotalProducts(response.data.totalProducts);
      }
    } catch (error) {
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        payload: apiPayload,
      });
    } finally {
      setLoading(false);
    }
  }, [apiPayload]);

  const handleCheckboxChange = (item) => {
    const currentTypes = formFields.productTypes;

    if (item === "All") {
      // If "All" is selected, clear other filters
      setValue("productTypes", ["all"]);
    } else {
      // If other filter is selected
      let newTypes;
      if (currentTypes.includes(item.toLowerCase())) {
        // If item already selected, remove it
        newTypes = currentTypes.filter((type) => type !== item.toLowerCase());
        // If no filters left, set back to "all"
        if (newTypes.length === 0) {
          newTypes = ["all"];
        }
      } else {
        // Add new item and remove "all"
        newTypes = currentTypes
          .filter((type) => type !== "all")
          .concat(item.toLowerCase());
      }
      setValue("productTypes", newTypes);
    }
  };

  //Custom background styling for range input based on current price
  const getBackgroundStyle = (value) => {
    const percentage = (value / formFields.maxPrice) * 100;
    return {
      background: `linear-gradient(to right, #EAB308 ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%)`,
    };
  };

  // Pagination function
  const handlePg = (value) => {
    let newPage;

    if (value === "next" && currPage < totalPages) {
      newPage = currPage + 1;
    } else if (value === "prev" && currPage > 1) {
      newPage = currPage - 1;
    } else if (typeof value === "number") {
      newPage = value;
    } else {
      return; // Invalid input
    }

    setCurrPage(newPage);
    setApiPayload((prev) => ({
      ...prev,
      page: newPage,
    }));
  };
  // reset page to 1 when category changes
  useEffect(() => {
    setCurrPage(1);
  }, [formFields.category]);

  // Loads products when the component mounts or when apiPayload changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reloads products when productReload is true
  useEffect(() => {
    if (reloadData === "products") {
      loadProducts().then(() => {
        // Reset the reload flag after loading
        dispatch(setReloadData(null));
      });
    }
  }, [reloadData, dispatch, loadProducts]);

  const handleDeleteModal = (product) => {
    dispatch(openProductDeleteModal(product));
  };

  const openForm = (product) => {
    dispatch(openProductForm(product ? product : null));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex max-[565px]:flex-col flex-row justify-between max-[565px]:justify-center max-[565px]:items-end gap-4">
        <h1 className="text-2xl font-bold text-white ml-20">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch(openExportModal("products"))}
            className="px-4 py-2 bg-gray-300 hover:bg-white text-black cursor-pointer rounded-lg transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => openForm()}
            className="bg-gray-300 hover:bg-white text-black cursor-pointer px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <img
              src={assets.plus}
              className="w-5 h-5 invert"
              alt="Add product"
            />
            Add New Product
          </button>
        </div>
      </div>

      {/*(ProductForm) Modal for adding and editing items */}
      {productFormState.isOpen && <ProductForm />}

      {/* Search and Filter Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        <div className="flex flex-col mb-4">
          <input
            type="range"
            min={formFields.minPrice}
            max={formFields.maxPrice}
            {...register("price")}
            onChange={(e) => setValue("price", Number(e.target.value))}
            style={getBackgroundStyle(formFields.price)}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white mb-4"
          />
          <div className="flex justify-between text-white/70 text-sm">
            <span>{formFields.minPrice} $</span>
            <span>{formFields.price} $</span>
            <span>{formFields.maxPrice} $</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500"
              {...register("searchQuery")}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              {...register("category")}
            >
              <option className="text-black bg-gray-400" value="comics">
                Comics
              </option>
              <option className="text-black bg-gray-400" value="clothes">
                Clothes
              </option>
              <option className="text-black bg-gray-400" value="shoes">
                Shoes
              </option>
              <option className="text-black bg-gray-400" value="toys">
                Toys
              </option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-gray-300 hover:bg-white text-black p-2 rounded-md cursor-pointer"
          >
            Load Products
          </button>
        </div>
        {/* Replace the checkBoxes function call with direct JSX */}
        {formFields.category && (
          <div className="mt-8">
            <label className="block text-white text-sm font-medium mb-2">
              {formFields.category === "clothes"
                ? "Available Cloth Types"
                : formFields.category === "shoes"
                  ? "Available Shoe Types"
                  : formFields.category === "comics"
                    ? "Available Genres"
                    : formFields.category === "toys"
                      ? "Available Toy Types"
                      : null}
            </label>
            <div className="flex flex-wrap gap-4">
              {availProductTypes.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    id={`${formFields.category}-${item}`}
                    value={item}
                    className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
                    checked={formFields.productTypes.includes(
                      item.toLowerCase(),
                    )}
                    onChange={() => handleCheckboxChange(item)}
                  />
                  <label
                    htmlFor={`${formFields.category}-${item}`}
                    className="text-sm text-gray-300 cursor-pointer hover:text-white transition-colors"
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
      {/* Products Table */}
      <div className="bg-white/5 rounded-xl border border-white/10">
        <div className="relative overflow-auto h-[400px]">
          {/* Single table with fixed header */}
          <table className="w-full min-w-[800px]">
            <thead className="bg-black/50 backdrop-blur-sm sticky top-0 z-10">
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
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr
                    key={index}
                    className="hover:bg-white/5 transition-colors"
                  >
                    {/* Edit & Delete buttons*/}
                    <td className="px-6 py-4">
                      <div className="flex justify-start gap-2">
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 bg-gray-300 hover:bg-white rounded-lg transition-colors group"
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
                          className="w-10 h-10 flex items-center justify-center p-2 bg-gray-300 hover:bg-white rounded-lg transition-colors group cursor-pointer"
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
                          className="w-10 h-10 rounded-lg object-cover bg-white/5"
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
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-500">
                        {product.category.charAt(0).toUpperCase() +
                          product.category.slice(1)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-white">
                        {product.price} $
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="max-h-[56px] overflow-y-auto flex flex-col gap-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {product.category === "toys" ? (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${
                              product.stock > 0
                                ? "bg-green-500/20 text-green-500"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {product.stock > 0
                              ? `${product.stock} available`
                              : "Out of Stock"}
                          </span>
                        ) : (
                          Object.entries(product.stock || {}).map(
                            ([key, quantity]) => (
                              <span
                                key={key}
                                className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                                  quantity > 0
                                    ? "bg-green-500/20 text-green-500"
                                    : "bg-red-500/20 text-red-500"
                                }`}
                              >
                                {product.category === "comics" ? "Vol." : ""}
                                {key}: {quantity > 0 ? quantity : "Out"}
                              </span>
                            ),
                          )
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

      {/* Pagination */}
      <div className="flex justify-between items-center">
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
