import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useSelector } from "react-redux";
import { ImagePlus } from "lucide-react";
import { LABEL_CLASS } from "./constants";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

// Image picker with preview; the chosen File is stored in the form as `imageFile` for submit
const ProductImageUpload = () => {
  const { register, setValue, setError, clearErrors, formState: { errors } } = useFormContext();
  const editProduct = useSelector((state) => state.dashboard.productFormState.selectedProduct);
  const [preview, setPreview] = useState(editProduct?.image || null);

  // Object URLs hold the file in memory until revoked
  useEffect(() => () => preview?.startsWith("blob:") && URL.revokeObjectURL(preview), [preview]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    // The server takes JPG, PNG or WebP up to 4 MB; checking here saves a failed upload
    if (file && (!TYPES.includes(file.type) || file.size > MAX_BYTES)) {
      e.target.value = "";
      return setError("image", { message: "Use a JPG, PNG or WebP image of 4 MB or less." });
    }
    clearErrors("image");
    setValue("imageFile", file || null);
    setPreview(file ? URL.createObjectURL(file) : editProduct?.image || null);
  };

  return (
    <div className="lg:sticky lg:top-0">
      <span className={LABEL_CLASS}>Product image</span>
      <label
        htmlFor="file-upload"
        className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-panel border border-dashed border-line-strong bg-canvas text-center transition-colors hover:border-ink"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="size-full object-contain p-3" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-6 text-[13px] text-muted">
            <ImagePlus aria-hidden="true" className="size-6 text-subtle" />
            Click to choose an image
            <span className="text-xs text-subtle">JPG, PNG or WebP, up to 4 MB</span>
          </span>
        )}
        <input
          id="file-upload"
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          // Optional when editing, where the current image is kept
          {...register("image", { required: !editProduct ? "An image is required." : false })}
          onChange={handleImageUpload}
        />
      </label>
      {preview && <p className="mt-2 text-xs text-muted">Click the image to replace it.</p>}
      {errors.image && <p role="alert" className="mt-1.5 text-xs text-danger">{errors.image.message}</p>}
    </div>
  );
};

export default ProductImageUpload;
