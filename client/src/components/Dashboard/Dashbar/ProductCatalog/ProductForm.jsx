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
import CategoryPicker from "./ProductFormSections/CategoryPicker";
import { Loader2, X } from "lucide-react";
import PropTypes from "prop-types";
import { splitList } from "./ProductFormSections/constants";

// Titled block of the form; the step number makes the top-to-bottom order explicit
const FormSection = ({ step, title, hint, children }) => (
  <section className="space-y-4">
    <header className="flex items-baseline gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold tabular-nums text-ink-300">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {hint && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
    </header>
    <div className="sm:pl-9">{children}</div>
  </section>
);

FormSection.propTypes = { step: PropTypes.number, title: PropTypes.string.isRequired, hint: PropTypes.string, children: PropTypes.node };

const EmptyHint = ({ children }) => (
  <p className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-ink-500">{children}</p>
);

EmptyHint.propTypes = { children: PropTypes.node };

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="flex max-h-[100dvh] w-full max-w-4xl flex-col rounded-t-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 sm:max-h-[90vh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <h2 id="product-form-title" className="truncate text-lg font-semibold text-white">
              {editProduct ? `Edit ${editProduct.name}` : "Add a product"}
            </h2>
            <p className="mt-0.5 text-sm text-ink-400">
              {editProduct ? `#${editProduct.productID}` : "It goes live in the shop as soon as you save."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-y-auto px-5 py-6 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-8">
                <FormSection step={1} title="Category" hint="Decides which details and stock fields appear below.">
                  <CategoryPicker />
                </FormSection>

                <FormSection step={2} title="Basics">
                  <BasicFields />
                </FormSection>

                <FormSection step={3} title="Details">
                  {!selectedCategory && <EmptyHint>Choose a category to see its options.</EmptyHint>}
                  {/* Kept mounted while hidden so their values and validation rules survive category switches */}
                  <ComicsFields />
                  <ClothesShoesFields />
                  <ToysFields />
                </FormSection>

                <FormSection step={4} title="Inventory">
                  {selectedCategory ? <StockFields /> : <EmptyHint>Choose a category to enter stock.</EmptyHint>}
                </FormSection>
              </div>

              <div className="lg:sticky lg:top-0 lg:self-start">
                <FormSection title="Image">
                  <ProductImageUpload />
                </FormSection>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.08] px-5 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="h-10 cursor-pointer rounded-lg px-4 text-sm font-medium text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-pink-500 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-pink-400 disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving…" : editProduct ? "Save changes" : "Create product"}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export default ProductForm;
