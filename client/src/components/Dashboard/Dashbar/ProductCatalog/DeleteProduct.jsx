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
          "An error occurred while deleting the product"
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-red-500/20 p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-red-500">Delete Product</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
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
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Product to be deleted:
          </h3>
          <div className="flex items-center gap-3">
            <img
              src={`${selectedProduct.image}`}
              alt={selectedProduct.name}
              className="w-12 h-12 rounded-lg object-cover bg-white/5"
            />
            <div className="flex-1">
              <p className="text-white font-medium">{selectedProduct.name}</p>
              <p className="text-gray-400 text-sm">
                ID: {selectedProduct.productID}
              </p>
              <p className="text-gray-400 text-sm">
                Category: {selectedProduct.category}
              </p>
              <p className="text-gray-400 text-sm">
                Price: ${selectedProduct.price}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            {/* Warning SVG Icon */}
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-400 text-sm">
              This action cannot be undone. To confirm deletion, please enter
              the product ID below.
            </p>
          </div>
        </div>

        {/* Product ID Display */}
        <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm font-medium">
              Product ID:
            </span>
            <span className="text-blue-300 text-sm font-mono bg-blue-500/20 px-2 py-1 rounded">
              {selectedProduct.productID}
            </span>
          </div>
        </div>

        {/* Product ID Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
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
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
            disabled={isDeleting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-white text-black rounded-lg transition-colors cursor-pointer"
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
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors cursor-pointer"
          >
            {isDeleting ? "Deleting..." : "Delete Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProduct;
