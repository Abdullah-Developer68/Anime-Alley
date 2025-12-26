// works for addItem and edit
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../../../api/api";
import {
  closeProductForm,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import { useSelector, useDispatch } from "react-redux";
import assets from "../../../../assets/asset";
import { toast } from "react-toastify";

const ProductForm = () => {
  // State for image preview and file handling
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  // Debug: Log render and state
  // console.log("RENDER", previewImage, selectedFile);

  //redux
  const dispatch = useDispatch();
  const { productFormState } = useSelector((state) => state.dashboard);

  const editProduct = productFormState.selectedProduct;

  // Initialize react-hook-form with default values and validation mode
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      productId: "", // Will be auto-generated for new products
      productName: "",
      description: "",
      price: "",
      stock: {},
      category: "",
      image: "",
      genres: "",
      volumes: "",
      availableSizes: [],
      merchandiseType: "",
      toyType: "",
    },
    mode: "onChange",
  });

  // Pre-populate form when editing a product
  useEffect(() => {
    if (editProduct) {
      // Basic field mapping
      setValue("productId", editProduct.productID || "");
      setValue("productName", editProduct.name || "");
      setValue("description", editProduct.description || "");
      setValue("price", editProduct.price || "");
      setValue("category", editProduct.category || "");

      // Handle array fields - convert arrays to comma-separated strings
      if (editProduct.genres) {
        setValue("genres", editProduct.genres.join(", "));
      }
      if (editProduct.volumes) {
        setValue("volumes", editProduct.volumes.join(", "));
      }
      if (editProduct.toyType) {
        setValue("toyType", editProduct.toyType);
      }
      if (Array.isArray(editProduct.availableSizes)) {
        setValue("availableSizes", editProduct.availableSizes);
      } else if (editProduct.sizes) {
        setValue("availableSizes", editProduct.sizes);
      }
      if (editProduct.merchType) {
        setValue("merchandiseType", editProduct.merchType);
      }
      if (editProduct.stock) {
        if (editProduct.category === "comics") {
          if (typeof editProduct.stock === "object") {
            Object.keys(editProduct.stock).forEach((volume) => {
              setValue(`stock_${volume}`, editProduct.stock[volume]);
            });
          }
        } else if (
          editProduct.category === "clothes" ||
          editProduct.category === "shoes"
        ) {
          if (typeof editProduct.stock === "object") {
            Object.keys(editProduct.stock).forEach((size) => {
              setValue(`stock_${size}`, editProduct.stock[size]);
            });
          }
        } else if (editProduct.category === "toys") {
          if (typeof editProduct.stock === "number") {
            setValue("stock", editProduct.stock);
          }
        }
      }
      // Always set preview to product image in edit mode
      if (editProduct.image) {
        // If the image is already a full URL (Cloudinary), use as is
        if (editProduct.image.startsWith("http")) {
          setPreviewImage(editProduct.image);
        } else {
          setPreviewImage(editProduct.image);
        }
      }
      setSelectedFile(null); // clear file selection in edit mode
    }
    // In add mode, do NOT reset previewImage or selectedFile here!
    // Let the user's selection persist.
  }, [editProduct, setValue]);

  /**
   * Handles image file selection and preview
   * @param {Event} e - File input change event
   */
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    console.log("Selected file:", file);

    if (file) {
      setSelectedFile(file);
      const imgUrl = URL.createObjectURL(file);
      setPreviewImage(imgUrl);
    } else {
      // If no file selected, reset to edit image if in edit mode
      setSelectedFile(null);
      if (editProduct && editProduct.image) {
        setPreviewImage(editProduct.image);
      } else {
        setPreviewImage(null);
      }
    }
  };

  // Watch form values for conditional rendering and validation
  const selectedCategory = watch("category");
  const availableSizes = watch("availableSizes") || [];
  const volumes = watch("volumes") || "";

  // Capitalize Volumes input as user types and validate format
  const handleVolumesChange = (e) => {
    let value = e.target.value;

    // Split by comma and process each volume
    const volumes = value.split(",").map((v) => v.trim());
    const processedVolumes = [];

    volumes.forEach((volume) => {
      if (volume === "") return; // Skip empty entries

      // Check if it matches the pattern (v or V followed by numbers)
      const match = volume.match(/^[vV](\d+)$/);
      if (match) {
        processedVolumes.push(`V${match[1]}`);
      } else if (volume !== "") {
        // If it doesn't match and isn't empty, keep original to show error
        processedVolumes.push(volume);
      }
    });

    const finalValue = processedVolumes.join(", ");
    setValue("volumes", finalValue, { shouldValidate: true });
  };

  // Track initial category to prevent clearing on first load
  const [initialCategory, setInitialCategory] = useState(null);

  // Handle category change to clear category-specific fields ONLY when category actually changes
  useEffect(() => {
    if (
      selectedCategory &&
      initialCategory !== null &&
      selectedCategory !== initialCategory
    ) {
      // Clear all category-specific fields when category changes

      // Clear comics fields
      setValue("genres", "");
      setValue("volumes", "");

      // Clear clothes/shoes fields
      setValue("availableSizes", []);
      setValue("merchandiseType", "");

      // Clear toys fields
      setValue("toyType", "");

      // Clear stock field (single stock for toys)
      setValue("stock", "");

      // Clear all dynamic stock fields (volume/size specific)
      const formData = watch();
      Object.keys(formData).forEach((key) => {
        if (key.startsWith("stock_")) {
          setValue(key, "");
        }
      });
    }

    // Update the initial category tracker
    if (selectedCategory && initialCategory === null) {
      setInitialCategory(selectedCategory);
    } else if (selectedCategory && selectedCategory !== initialCategory) {
      setInitialCategory(selectedCategory);
    }
  }, [selectedCategory, initialCategory, watch, setValue]);

  /**
   * Handles form submission
   * Processes form data based on product category and sends to backend
   * @param {Object} data - Form data from react-hook-form
   */
  const onSubmit = async (data) => {
    try {
      setError(null);
      const formData = new FormData();

      // Basic fields
      // Only append productID for updates (editing existing products)
      if (editProduct) {
        formData.append("productID", data.productId);
      }
      // For new products, productID will be auto-generated by the backend

      formData.append("name", data.productName);
      formData.append("description", data.description);
      formData.append("price", data.price);
      formData.append("category", data.category);

      // Handle image - only append if new file selected, otherwise keep existing
      if (selectedFile) {
        formData.append("image", selectedFile);
      } else if (editProduct && editProduct.image) {
        formData.append("image", editProduct.image);
      }

      if (data.category === "comics") {
        const volumes = data.volumes
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v);

        const stockData = {};
        volumes.forEach((volume) => {
          stockData[volume] = parseInt(data[`stock_${volume}`]) || 0;
        });

        formData.append("stock", JSON.stringify(stockData));
        formData.append("volumes", JSON.stringify(volumes));
        formData.append(
          "genres",
          JSON.stringify(
            data.genres
              .split(",")
              .map((g) => g.trim())
              .filter((g) => g),
          ),
        );
      } else if (data.category === "clothes" || data.category === "shoes") {
        const stockData = {};
        data.availableSizes.forEach((size) => {
          stockData[size] = parseInt(data[`stock_${size}`]) || 0;
        });

        formData.append("stock", JSON.stringify(stockData));
        formData.append("sizes", JSON.stringify(data.availableSizes));
        formData.append("merchType", data.merchandiseType);
      } else if (data.category === "toys") {
        formData.append("stock", JSON.stringify(parseInt(data.stock) || 0));
        formData.append("toyType", data.toyType.trim());
      }

      // Determine if this is an edit or create operation
      const response = editProduct
        ? await api.updateProduct(formData)
        : await api.createProduct(formData);

      if (response.data.success) {
        // Show success message with generated product ID for new products
        if (
          !editProduct &&
          response.data.product &&
          response.data.product.productID
        ) {
          toast.success(
            `Product created successfully! Generated ID: ${response.data.product.productID}`,
          );
        } else {
          toast.success(
            `Product ${editProduct ? "updated" : "created"} successfully!`,
          );
        }
        dispatch(setReloadData("products"));
        handleClose();
      } else {
        setError(response.data.message || "An error occurred");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      setError(error.message);
    }
  };

  /**
   * Closes the modal and resets form state
   */
  const handleClose = () => {
    dispatch(closeProductForm());
  };

  /**
   * Handles size selection for clothes/shoes
   * @param {string} size - Selected size
   */
  const handleSizeChange = (size) => {
    const newSizes = availableSizes.includes(size)
      ? availableSizes.filter((s) => s !== size)
      : [...availableSizes, size];
    setValue("availableSizes", newSizes, { shouldValidate: true });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1a1a1a] z-10">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Enter Product Details
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <img src={assets.cross} alt="cross" className="cursor-pointer" />
          </button>
        </div>

        {/* Form */}
        <form className="p-4 sm:p-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Product ID
                      {!editProduct && (
                        <span className="text-yellow-500 text-xs ml-2">
                          (Auto-generated)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base ${
                        editProduct
                          ? "bg-white/5 border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500"
                          : "bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed"
                      }`}
                      placeholder={
                        editProduct ? "Product ID" : "Will be auto-generated"
                      }
                      disabled={!editProduct}
                      {...register("productId", {
                        required: editProduct
                          ? "Product ID is required!"
                          : false,
                      })}
                    />
                    {errors.productId && editProduct && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.productId.message}
                      </span>
                    )}
                    {!editProduct && (
                      <span className="text-yellow-500 text-xs mt-1 block">
                        Product ID will be automatically generated based on
                        category
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                      placeholder="Enter product name"
                      {...register("productName", {
                        required: "Product name is required!",
                      })}
                    />
                    {errors.productName && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.productName.message}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 min-h-[100px] text-sm sm:text-base resize-none"
                    placeholder="Enter product description"
                    {...register("description", {
                      required: "Description is required!",
                    })}
                  />
                  {errors.description && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {errors.description.message}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                      placeholder="Enter price"
                      {...register("price", { required: "Price is required!" })}
                    />
                    {errors.price && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.price.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                      {...register("category", {
                        required: "Category is required!",
                      })}
                      onChange={(e) => {
                        setValue("category", e.target.value);
                      }}
                    >
                      <option className="bg-gray-800 text-gray-300" value="">
                        Select Category
                      </option>
                      <option
                        className="bg-gray-800 text-gray-300"
                        value="clothes"
                      >
                        Clothes
                      </option>
                      <option
                        className="bg-gray-800 text-gray-300"
                        value="shoes"
                      >
                        Shoes
                      </option>
                      <option
                        className="bg-gray-800 text-gray-300"
                        value="comics"
                      >
                        Comics
                      </option>
                      <option
                        className="bg-gray-800 text-gray-300"
                        value="toys"
                      >
                        Toys
                      </option>
                    </select>
                    {errors.category && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.category.message}
                      </span>
                    )}
                  </div>

                  <div className="sm:col-span-2 xl:col-span-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Stock
                    </label>
                    {selectedCategory === "comics" ? (
                      <>
                        {volumes
                          .split(",")
                          .map((v) => v.trim())
                          .filter((v) => v).length === 0 ? (
                          <div className="text-yellow-400 text-xs mb-2 p-2 bg-yellow-400/10 rounded">
                            Please enter at least one volume number below to
                            enter stock values.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {volumes
                              .split(",")
                              .map((v) => v.trim())
                              .filter((v) => v)
                              .map((volume) => (
                                <div
                                  key={volume}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-white/70 text-xs min-w-[60px]">
                                    Vol {volume}:
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 text-sm"
                                    placeholder={`Stock`}
                                    {...register(`stock_${volume}`, {
                                      required: `Stock for Volume ${volume} is required!`,
                                      min: {
                                        value: 0,
                                        message: "Stock cannot be negative",
                                      },
                                      validate: (value) =>
                                        !isNaN(parseInt(value)) ||
                                        "Must be a valid number",
                                    })}
                                  />
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    ) : selectedCategory === "clothes" ||
                      selectedCategory === "shoes" ? (
                      <>
                        {availableSizes.length === 0 ? (
                          <div className="text-yellow-400 text-xs mb-2 p-2 bg-yellow-400/10 rounded">
                            Please select at least one size below to enter stock
                            values.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {["XS", "S", "M", "L", "XL", "XXL"]
                              .filter((size) => availableSizes.includes(size))
                              .map((size) => (
                                <div
                                  key={size}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-white hover:text-black hover:bg-white text-xs min-w-[50px]">
                                    {size}:
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 text-sm"
                                    placeholder={`Stock`}
                                    {...register(`stock_${size}`, {
                                      required: `Stock for Size ${size} is required!`,
                                      min: {
                                        value: 0,
                                        message: "Stock cannot be negative",
                                      },
                                      validate: (value) =>
                                        !isNaN(parseInt(value)) ||
                                        "Must be a valid number",
                                    })}
                                  />
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    ) : selectedCategory !== "" ? (
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                        placeholder="Enter stock"
                        {...register("stock", {
                          required: "Stock is required!",
                          min: {
                            value: 0,
                            message: "Stock cannot be negative",
                          },
                          validate: (value) =>
                            !isNaN(parseInt(value)) || "Must be a valid number",
                        })}
                      />
                    ) : null}
                    {errors.stock && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.stock.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Specific Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">
                  Additional Details
                </h3>

                {/* Comics Specific */}
                <div
                  className={`space-y-4 comics-fields ${
                    selectedCategory === "comics" ? "block" : "hidden"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Genres
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Action",
                          "Adventure",
                          "Comedy",
                          "Drama",
                          "Fantasy",
                        ].map((genre) => (
                          <label
                            key={genre}
                            className={`inline-flex items-center px-3 py-1 rounded-full border border-white/10 cursor-pointer hover:bg-white hover:text-black transition-colors text-sm ${
                              watch("genres")
                                ?.split(",")
                                .map((g) => g.trim())
                                .includes(genre)
                                ? "bg-pink-500 text-black"
                                : "bg-white/5 text-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={genre}
                              className="sr-only"
                              checked={
                                watch("genres")
                                  ?.split(",")
                                  .map((g) => g.trim())
                                  .includes(genre) || false
                              }
                              onChange={(e) => {
                                const currentGenres =
                                  watch("genres")
                                    ?.split(",")
                                    .map((g) => g.trim())
                                    .filter((g) => g) || [];
                                let newGenres;
                                if (e.target.checked) {
                                  newGenres = [...currentGenres, genre];
                                } else {
                                  newGenres = currentGenres.filter(
                                    (g) => g !== genre,
                                  );
                                }
                                setValue("genres", newGenres.join(", "), {
                                  shouldValidate: true,
                                });
                              }}
                            />
                            <span>{genre}</span>
                          </label>
                        ))}
                      </div>
                      {errors.genres && (
                        <span className="text-red-500 text-xs mt-1 block">
                          {errors.genres.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Volume Numbers
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                        placeholder="V1, V2, V10, ... (e.g. V1, V2, V10)"
                        {...register("volumes", {
                          validate: (value) => {
                            if (selectedCategory !== "comics") return true;
                            if (value.trim() === "")
                              return "Volume numbers are required for comics";

                            // Split by comma and validate each volume
                            const volumes = value
                              .split(",")
                              .map((v) => v.trim())
                              .filter((v) => v !== "");

                            // Check if all volumes match the V+number format
                            const invalidVolumes = volumes.filter(
                              (v) => !/^V\d+$/.test(v),
                            );
                            if (invalidVolumes.length > 0) {
                              return `Invalid format: "${invalidVolumes.join(
                                ", ",
                              )}". Use format: V1, V2, V10, etc.`;
                            }

                            // Check for duplicates
                            const uniqueVolumes = [...new Set(volumes)];
                            if (uniqueVolumes.length !== volumes.length) {
                              return "Duplicate volume numbers are not allowed";
                            }

                            return true;
                          },
                        })}
                        onBlur={handleVolumesChange}
                      />
                      {errors.volumes && (
                        <span className="text-red-500 text-xs mt-1 block">
                          {errors.volumes.message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clothes & Shoes Specific */}
                <div
                  className={`space-y-4 clothes-shoes-fields ${
                    selectedCategory === "clothes" ||
                    selectedCategory === "shoes"
                      ? "block"
                      : "hidden"
                  }`}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                        <label
                          key={size}
                          className={`inline-flex items-center px-3 py-1 rounded-full border border-white/10 cursor-pointer hover:bg-white hover:text-black transition-colors text-sm ${
                            availableSizes.includes(size)
                              ? "bg-pink-500 text-black"
                              : "bg-white/5 text-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={size}
                            className="sr-only"
                            checked={availableSizes.includes(size)}
                            onChange={() => handleSizeChange(size)}
                          />
                          <span>{size}</span>
                        </label>
                      ))}
                    </div>
                    {errors.availableSizes && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.availableSizes.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Merchandise Type
                    </label>
                    <select
                      className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                      {...register("merchandiseType", {
                        validate: (value) =>
                          !["clothes", "shoes"].includes(selectedCategory) ||
                          value.trim() !== "" ||
                          "Merchandise type is required!",
                      })}
                    >
                      <option className="bg-black text-white" value="">
                        Select Type
                      </option>
                      {selectedCategory === "clothes" && (
                        <>
                          <option
                            className="bg-gray-800 text-gray-300"
                            value="t-shirt"
                          >
                            T-Shirt
                          </option>
                          <option
                            className="bg-gray-800 text-gray-300"
                            value="jacket"
                          >
                            Jacket
                          </option>
                          <option
                            className="bg-gray-800 text-gray-300"
                            value="pants"
                          >
                            Pants
                          </option>
                        </>
                      )}
                      {selectedCategory === "shoes" && (
                        <>
                          <option
                            className="bg-gray-800 text-gray-300"
                            value="sneakers"
                          >
                            Sneakers
                          </option>
                          <option
                            className="bg-gray-800 text-gray-300"
                            value="boots"
                          >
                            Boots
                          </option>
                        </>
                      )}
                    </select>
                    {errors.merchandiseType && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.merchandiseType.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Toys Specific */}
                <div
                  className={`space-y-4 toys-fields ${
                    selectedCategory === "toys" ? "block" : "hidden"
                  }`}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Toy Type
                    </label>
                    <select
                      className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm sm:text-base"
                      {...register("toyType", {
                        validate: (value) =>
                          selectedCategory !== "toys" ||
                          value.trim() !== "" ||
                          "Toy type is required!",
                      })}
                    >
                      <option className="bg-black text-white" value="">
                        Select Type
                      </option>
                      <option
                        className="bg-gray-800 text-gray-300"
                        value="action-figure"
                      >
                        Action Figure
                      </option>

                      <option className="bg-gray-800 text-gray-300" value="car">
                        Car
                      </option>
                    </select>
                    {errors.toyType && (
                      <span className="text-red-500 text-xs mt-1 block">
                        {errors.toyType.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Right Column - Image Upload */}
            <div className="lg:col-span-1">
              <div className="space-y-4 sticky top-24">
                <h3 className="text-lg font-medium text-white">
                  Product Image
                </h3>
                <div className="border-2 border-dashed border-white/10 rounded-lg p-4 sm:p-6 text-center">
                  <div className="space-y-2">
                    <img
                      src={assets.file}
                      alt="file icon"
                      className="mx-auto mb-2"
                    />
                    <div className="text-sm text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative flex flex-col justify-center items-center cursor-pointer text-pink-500 hover:text-pink-400"
                      >
                        <span className="bg-pink-500 w-full sm:w-32 p-2 text-black hover:bg-pink-600 rounded-full text-sm transition-colors">
                          Upload a file
                        </span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          {...register("image", {
                            required: !editProduct
                              ? "Image is required!"
                              : false, // Make optional in edit mode
                          })}
                          onChange={handleImageUpload}
                        />
                        {errors.image && (
                          <span className="text-red-500 text-xs mt-2 block">
                            {errors.image.message}
                          </span>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      PNG, JPG, GIF up to 10MB
                    </p>

                    {previewImage && (
                      <div className="mt-4">
                        <img
                          src={previewImage}
                          className="w-full max-h-48 object-contain rounded-lg border border-white/20"
                          alt="Preview"
                        />
                        <p className="text-green-400 text-xs mt-2">
                          ✓ Image selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 mt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="w-full cursor-pointer sm:w-auto px-4 py-2 bg-gray-300 hover:bg-white text-black rounded-lg transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto cursor-pointer px-4 py-2 bg-gray-300 hover:bg-white text-black rounded-lg transition-colors text-sm sm:text-base font-medium"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
