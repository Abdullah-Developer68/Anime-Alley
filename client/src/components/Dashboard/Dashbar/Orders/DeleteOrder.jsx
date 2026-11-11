import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeOrderDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { toast } from "react-toastify";
import ConfirmDeleteDialog, { DeletePreview } from "../../ConfirmDeleteDialog";
import { formatMoney } from "../../../../utils/formatPrice";

const DeleteOrder = () => {
  const dispatch = useDispatch();
  const { orderDeleteModalState } = useSelector((state) => state.dashboard);
  const { isOpen, selectedOrder } = orderDeleteModalState;

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "CONFIRM") {
      setError("You must type CONFIRM to delete this order.");
      return;
    }
    try {
      setIsDeleting(true);
      setError("");
      const response = await api.deleteOrder(selectedOrder._id);
      if (response.data.success) {
        toast.success("Order deleted successfully!");
        dispatch(setReloadData("orders"));
        handleClose();
      } else {
        setError(response.data.message || "Failed to delete order");
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "An error occurred while deleting the order",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    dispatch(closeOrderDeleteModal());
  };

  if (!isOpen || !selectedOrder) return null;

  return (
    <ConfirmDeleteDialog
      title="Delete order"
      description="This order will be permanently removed. This can't be undone."
      preview={
        <DeletePreview
          title={selectedOrder.orderID}
          details={[
            selectedOrder.user ? `${selectedOrder.user.username} · ${selectedOrder.user.email}` : "Deleted user",
            `${formatMoney(selectedOrder.finalAmount)} · ${selectedOrder.status}`,
          ]}
        />
      }
      phrase="CONFIRM"
      value={confirmText}
      onChange={setConfirmText}
      error={error}
      isDeleting={isDeleting}
      confirmLabel="Delete order"
      onCancel={handleClose}
      onConfirm={handleDelete}
    />
  );
};

export default DeleteOrder;
