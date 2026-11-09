// works for addItem and edit
import { useState, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import api from "../../../../api/api";
import {
  closeProductForm,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { formatPrice } from "../../../../utils/formatPrice";
import { validateComicVolumes } from "../../../../utils/volume";
import BasicFields from "./ProductFormSections/BasicFields";
import StockFields from "./ProductFormSections/StockFields";
import ComicsFields from "./ProductFormSections/ComicsFields";
import ClothesShoesFields from "./ProductFormSections/ClothesShoesFields";
import ToysFields from "./ProductFormSections/ToysFields";
import ProductImageUpload from "./ProductFormSections/ProductImageUpload";
import { splitList } from "./ProductFormSections/constants";

// Sections read and update the form through useFormContext, so nothing is passed down as props
const ProductForm = () => {
  //redux
  const dispatch = useDispatch();
  const { productFormState } = useSelector((state) => state.dashboard);

  const editProduct = productFormState.selectedProduct;

  // Initialize react-hook-form with default values and validation mode
  const methods = useForm({
    defaultValues: {
      productId: "", // Auto-generated for new products, kept in state
      productName: "",
      description: "",
      price: "",
      stock: "",
      category: "",
      image: "",
      imageFile: null, // File picked in ProductImageUpload
      genres: "",
      volumes: "",
      availableSizes: [],
      clothesType: "",
      shoeType: "",
      toyType: "",
    },
    mode: "onChange",
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    clearErrors,
    watch,
  } = methods;

  // Pre-populate form when editing a product
  useEffect(() => {
    if (editProduct) {
      // Basic field mapping
      setValue("productId", editProduct.productID || "");
      setValue("productName", editProduct.name || "");
      setValue("description", editProduct.description || "");
      setValue("price", editProduct.price != null ? formatPrice(editProduct.price) : "");
      setValue("category", editProduct.category || "");

      // Handle array fields - convert arrays to comma-separated strings
      if (Array.isArray(editProduct.genres))
        setValue("genres", editProduct.genres.join(", "));

      if (editProduct.toyType)
        setValue("toyType", editProduct.toyType.toLowerCase().replace(/\s+/g, "-"));
      if (editProduct.clothesType)
        setValue("clothesType", editProduct.clothesType.toLowerCase());
      if (editProduct.shoeType)
        setValue("shoeType", editProduct.shoeType.toLowerCase());
      // Populate variants and stock
      if (Array.isArray(editProduct.variants) && editProduct.variants.length > 0) {
        if (editProduct.category === "comics") {
          const vols = editProduct.variants.map((v) => v.label);
          setValue("volumes", vols.join(", "));
          editProduct.variants.forEach((v) => {
            setValue(`stock_${v.label}`, v.stock);
          });
        } else if (
          editProduct.category === "clothes" ||
          editProduct.category === "shoes"
        ) {
          const sizes = editProduct.variants.map((v) => v.label);
          setValue("availableSizes", sizes);
          editProduct.variants.forEach((v) => {
            setValue(`stock_${v.label}`, v.stock);
          });
        } else if (editProduct.category === "toys") {
          const defVariant = editProduct.variants.find((v) => v.label === "Default");
          setValue("stock", defVariant ? defVariant.stock : 0);
        }
      }
    }
  }, [editProduct, setValue]);

  const selectedCategory = watch("category");

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
      clearErrors("availableSizes");
      setValue("clothesType", "");
      setValue("shoeType", "");
      clearErrors("clothesType");
      clearErrors("shoeType");

      // Clear toys fields
      setValue("toyType", "");
      clearErrors("toyType");

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
    if (selectedCategory && initialCategory === null)
      setInitialCategory(selectedCategory);
    else if (selectedCategory && selectedCategory !== initialCategory)
      setInitialCategory(selectedCategory);
  }, [selectedCategory, initialCategory, watch, setValue, clearErrors]);

  // The form is unmounted when closed, so its local state resets on its own
  const handleClose = () => dispatch(closeProductForm());

  // Stock per size/volume label -> [{ label, stock }]
  const toVariants = (labels, data) =>
    labels.map((label) => ({
      label,
      stock: Number(data[`stock_${label}`]) || 0,
    }));

  // Handles form submission
  // Processes form data based on product category and sends to backend
  const onSubmit = async (data) => {
    try {
      const formData = new FormData();

      // Basic fields (updates identify the product by its _id in the URL, see api.updateProduct)
      formData.append("name", data.productName);
      formData.append("description", data.description);
      formData.append("price", formatPrice(data.price));
      formData.append("category", data.category);

      // Handle image - only append if new file selected, otherwise keep existing
      if (data.imageFile)
        formData.append("image", data.imageFile);
      else if (editProduct && editProduct.image)
        formData.append("image", editProduct.image);

      if (data.category === "comics") {
        const volumes = splitList(data.volumes);

        const volumeValidation = validateComicVolumes(volumes);
        if (!volumeValidation.valid) {
          toast.error(volumeValidation.message);
          return;
        }

        formData.append("genres", JSON.stringify(splitList(data.genres)));
        formData.append("variants", JSON.stringify(toVariants(volumes, data)));
      } else if (data.category === "clothes" || data.category === "shoes") {
        const sizes = Array.isArray(data.availableSizes) ? data.availableSizes : [];
        const typeField = data.category === "clothes" ? "clothesType" : "shoeType";

        formData.append(typeField, data[typeField].toLowerCase());
        formData.append("variants", JSON.stringify(toVariants(sizes, data)));
      } else {
        // Toys and any custom category have a single default variant
        if (data.category === "toys")
          formData.append("toyType", data.toyType.toLowerCase());
        formData.append(
          "variants",
          JSON.stringify([{ label: "Default", stock: Number(data.stock) || 0 }]),
        );
      }

      // API call to create or update product with proper error handling
      let response;
      if (editProduct)
        response = await api.updateProduct(editProduct._id, formData);
      else
        response = await api.createProduct(formData);

      if (response.data.success) {
        toast.success(
          editProduct
            ? "Product updated successfully!"
            : "Product created successfully!",
        );
        handleClose();
        dispatch(setReloadData("products"));
      } else {
        toast.error(
          response.data.message ||
            `Failed to ${editProduct ? "update" : "create"} product`,
        );
      }
    } catch (err) {
      console.error("Product submission error:", err);
      toast.error(
        err.response?.data?.message ||
          `Failed to ${editProduct ? "update" : "create"} product. Please try again.`,
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl p-4 sm:p-6 bg-[#0b0b10] border rounded-2xl border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white sm:text-xl">
            {editProduct ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 transition-colors cursor-pointer hover:text-white"
          >
            ✕
          </button>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column - Product Details */}
              <div className="space-y-4 lg:col-span-2">
                <div className="space-y-4">
                  <BasicFields />
                  <StockFields />
                </div>

                {/* Category Specific Fields */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">
                    Additional Details
                  </h3>
                  <ComicsFields />
                  <ClothesShoesFields />
                  <ToysFields />
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="lg:col-span-1">
                <ProductImageUpload />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col justify-end gap-3 pt-6 mt-6 border-t sm:flex-row sm:gap-4 border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-2 text-sm text-black transition-colors bg-gray-300 rounded-lg cursor-pointer sm:w-auto hover:bg-white sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-4 py-2 text-sm font-medium text-black transition-colors bg-gray-300 rounded-lg sm:w-auto sm:text-base ${
                  isSubmitting
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:bg-white"
                }`}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export default ProductForm;
