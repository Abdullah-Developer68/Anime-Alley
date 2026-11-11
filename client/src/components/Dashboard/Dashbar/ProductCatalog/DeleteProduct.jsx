import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeProductDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { toast } from "react-toastify";
import ConfirmDeleteDialog, { DeletePreview } from "../../ConfirmDeleteDialog";
import { formatMoney } from "../../../../utils/formatPrice";

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
      setError("Product ID does not match");
      return;
    }

    try {
      setIsDeleting(true);
      setError("");

      const res = await api.deleteProduct(selectedProduct._id);

      if (res.data.success) {
        toast.success("Product deleted successfully!");
        handleClose();
        dispatch(setReloadData("products"));
      } else
        toast.error(res.data.message || "Failed to delete product");
    } catch (err) {
      console.error("Delete product error:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to delete product. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setProductId("");
    setError("");
    dispatch(closeProductDeleteModal());
  };

  if (!isOpen || !selectedProduct) return null;

  return (
    <ConfirmDeleteDialog
      title="Delete product"
      description="It will be removed from the shop and its image deleted. This can't be undone."
      preview={
        <DeletePreview
          media={<img src={selectedProduct.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white/5 object-cover" />}
          title={selectedProduct.name}
          details={[`#${selectedProduct.productID} · ${selectedProduct.category}`, formatMoney(selectedProduct.price)]}
        />
      }
      phrase={selectedProduct.productID}
      value={productId}
      onChange={(value) => {
        setProductId(value);
        setError("");
      }}
      error={error}
      isDeleting={isDeleting}
      confirmLabel="Delete product"
      onCancel={handleClose}
      onConfirm={handleDelete}
    />
  );
};

export default DeleteProduct;
