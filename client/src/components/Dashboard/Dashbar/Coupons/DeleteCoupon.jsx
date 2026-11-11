import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeCouponDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { toast } from "react-toastify";
import ConfirmDeleteDialog, { DeletePreview } from "../../ConfirmDeleteDialog";
import { formatDate } from "../../../../utils/formatDate";

const DeleteCoupon = () => {
  const dispatch = useDispatch();
  const { couponDeleteModalState } = useSelector((state) => state.dashboard);
  const { isOpen, selectedCoupon } = couponDeleteModalState;

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "CONFIRM") {
      setError("You must type CONFIRM to delete this coupon.");
      return;
    }
    try {
      setIsDeleting(true);
      setError("");
      const response = await api.deleteCoupon(selectedCoupon._id);
      if (response.data.success) {
        toast.success("Coupon deleted successfully!");
        dispatch(setReloadData("coupons"));
        handleClose();
      } else {
        setError(response.data.message || "Failed to delete coupon");
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "An error occurred while deleting the coupon",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    dispatch(closeCouponDeleteModal());
  };

  if (!isOpen || !selectedCoupon) return null;

  return (
    <ConfirmDeleteDialog
      title="Delete coupon"
      description="Customers will no longer be able to use this code. This can't be undone."
      preview={
        <DeletePreview
          title={selectedCoupon.couponCode}
          details={[
            `${selectedCoupon.discountPercentage}% off · valid until ${formatDate(selectedCoupon.expiryDate)}`,
            `${selectedCoupon.totalUsage || 0} uses so far`,
          ]}
        />
      }
      phrase="CONFIRM"
      value={confirmText}
      onChange={setConfirmText}
      error={error}
      isDeleting={isDeleting}
      confirmLabel="Delete coupon"
      onCancel={handleClose}
      onConfirm={handleDelete}
    />
  );
};

export default DeleteCoupon;
