import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useSelector } from "react-redux";
import assets from "../../../../../assets/asset";

// Image picker with preview; the chosen File is stored in the form as `imageFile` for submit
const ProductImageUpload = () => {
  const { register, setValue, formState: { errors } } = useFormContext();
  const editProduct = useSelector((state) => state.dashboard.productFormState.selectedProduct);
  const [previewImage, setPreviewImage] = useState(editProduct?.image || null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    setValue("imageFile", file || null);
    // With no file selected, fall back to the product's current image in edit mode
    if (file)
      setPreviewImage(URL.createObjectURL(file));
    else
      setPreviewImage(editProduct?.image || null);
  };

  return (
    <div className="sticky space-y-4 top-24">
      <h3 className="text-lg font-medium text-white">Product Image</h3>
      <div className="p-4 text-center border-2 border-dashed rounded-lg border-white/10 sm:p-6">
        <div className="space-y-2">
          <img src={assets.file} alt="file icon" className="mx-auto mb-2" />
          <div className="text-sm text-gray-400">
            <label
              htmlFor="file-upload"
              className="relative flex flex-col items-center justify-center text-pink-500 cursor-pointer hover:text-pink-400"
            >
              <span className="w-full p-2 text-sm text-black transition-colors bg-pink-500 rounded-full sm:w-32 hover:bg-pink-600">
                Upload a file
              </span>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept="image/*"
                // Optional in edit mode, where the current image is kept
                {...register("image", { required: !editProduct ? "Image is required!" : false })}
                onChange={handleImageUpload}
              />
              {errors.image && <span className="block mt-2 text-xs text-red-500">{errors.image.message}</span>}
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>

          {previewImage && (
            <div className="mt-4">
              <img
                src={previewImage}
                className="object-contain w-full border rounded-lg max-h-48 border-white/20"
                alt="Preview"
              />
              <p className="mt-2 text-xs text-green-400">✓ Image selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductImageUpload;
