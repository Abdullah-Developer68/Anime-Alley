import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeProductDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { toast } from "react-toastify";

const DeleteProduct = () => {
  const dispatch = useDispatch();
  const { productDeleteModalState } = useSelector((state) => state.dashboard);
  const { isOpen, selectedProduct } = productDeleteModalState;

  const [productId, setProductId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!productId.trim()) {
      setError("Please enter a product ID");
      return;
    }

    if (productId !== selectedProduct.productID) {
      setError("Product ID does not match the selected product");

      return;
    }

    try {
      setIsDeleting(true);
      setError("");

      const response = await api.deleteProduct(productId);

      if (response.data.success) {
        // Show success alert
        toast.success("Product deleted successfully!");

        // Activate reload reducer to refresh the product list
        dispatch(setReloadData("products"));

        // Close the modal
        handleClose();
      } else {
        setError(response.data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      setError(
        error.response?.data?.message ||
          "An error occurred while deleting the product",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setProductId("");
    setError("");
    dispatch(closeProductDeleteModal());
  };

  if (!isOpen || !selectedProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-gray-900 border rounded-xl border-red-500/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-red-500">Delete Product</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Product Information */}
        <div className="p-4 mb-6 border rounded-lg bg-white/5 border-white/10">
          <h3 className="mb-3 text-sm font-medium text-gray-400">
            Product to be deleted:
          </h3>
          <div className="flex items-center gap-3">
            <img
              src={`${selectedProduct.image}`}
              alt={selectedProduct.name}
              className="object-cover w-12 h-12 rounded-lg bg-white/5"
            />
            <div className="flex-1">
              <p className="font-medium text-white">{selectedProduct.name}</p>
              <p className="text-sm text-gray-400">
                ID: {selectedProduct.productID}
              </p>
              <p className="text-sm text-gray-400">
                Category: {selectedProduct.category}
              </p>
              <p className="text-sm text-gray-400">
                Price: ${selectedProduct.price}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="p-3 mb-4 border rounded-lg bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-2">
            {/* Warning SVG Icon */}
            <svg
              className="flex-shrink-0 w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-400">
              This action cannot be undone. To confirm deletion, please enter
              the product ID below.
            </p>
          </div>
        </div>

        {/* Product ID Display */}
        <div className="p-3 mb-3 border rounded-lg bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-400">
              Product ID:
            </span>
            <span className="px-2 py-1 font-mono text-sm text-blue-300 rounded bg-blue-500/20">
              {selectedProduct.productID}
            </span>
          </div>
        </div>

        {/* Product ID Input */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-400">
            Enter Product ID to confirm deletion:
          </label>
          <input
            type="text"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setError(""); // Clear error when user types
            }}
            placeholder={`Enter: ${selectedProduct.productID}`}
            className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10 placeholder:text-white/30 focus:outline-none focus:border-red-500"
            disabled={isDeleting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 mb-4 border rounded-lg bg-red-500/10 border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-black transition-colors bg-gray-300 rounded-lg cursor-pointer hover:bg-white"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={
              isDeleting ||
              !productId.trim() ||
              productId !== selectedProduct.productID
            }
            className="flex-1 px-4 py-2 font-medium text-white transition-colors bg-red-500 rounded-lg cursor-pointer hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProduct;
