import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useSelector } from "react-redux";
import { ImagePlus, RefreshCw } from "lucide-react";
import FieldError from "./FieldError";

// Image picker with preview and drag-and-drop; the chosen File is stored in the form as `imageFile` for submit
const ProductImageUpload = () => {
  const { register, setValue } = useFormContext();
  const editProduct = useSelector((state) => state.dashboard.productFormState.selectedProduct);
  const [previewImage, setPreviewImage] = useState(editProduct?.image || null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  // Optional in edit mode, where the current image is kept
  const imageField = register("image", { required: !editProduct ? "Image is required!" : false });

  // Object URLs hold the file in memory until revoked
  useEffect(
    () => () => {
      if (previewImage?.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    },
    [previewImage],
  );

  const handleImageUpload = (e) => {
    imageField.onChange(e);
    const file = e.target.files[0];
    setValue("imageFile", file || null);
    setFileName(file?.name || "");
    // With no file selected, fall back to the product's current image in edit mode
    if (file)
      setPreviewImage(URL.createObjectURL(file));
    else
      setPreviewImage(editProduct?.image || null);
  };

  // A dropped file goes into the real input, so validation and submit see it exactly like a picked one
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/") || !inputRef.current) return;
    inputRef.current.files = e.dataTransfer.files;
    inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const dragProps = {
    onDragOver: (e) => {
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: handleDrop,
  };

  return (
    <div>
      <input
        id="file-upload"
        type="file"
        className="sr-only"
        accept="image/*"
        {...imageField}
        ref={(el) => {
          imageField.ref(el);
          inputRef.current = el;
        }}
        onChange={handleImageUpload}
      />

      {previewImage ? (
        <div {...dragProps} className={`overflow-hidden rounded-xl border ${isDragging ? "border-pink-400/60" : "border-white/10"}`}>
          <div className="flex aspect-square items-center justify-center bg-white/[0.03] p-3">
            <img src={previewImage} alt="Product preview" className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-3 py-2">
            <p className="min-w-0 truncate text-xs text-ink-400">{fileName || "Current image"}</p>
            <label
              htmlFor="file-upload"
              className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-200 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Replace
            </label>
          </div>
        </div>
      ) : (
        <label
          htmlFor="file-upload"
          {...dragProps}
          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-pink-400/60 bg-pink-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-ink-300">
            <ImagePlus aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="text-sm text-ink-200">
            Drop an image or <span className="font-semibold text-pink-300">browse</span>
          </span>
          <span className="text-xs text-ink-500">PNG, JPG, GIF up to 10MB</span>
        </label>
      )}
      <FieldError name="image" />
    </div>
  );
};

export default ProductImageUpload;
