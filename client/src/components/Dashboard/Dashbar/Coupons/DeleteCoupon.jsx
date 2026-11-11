import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeCouponDeleteModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { formatDate } from "../../../../utils/money";
import ConfirmDialog from "../../shared/ConfirmDialog";

const DeleteCoupon = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedCoupon } = useSelector((state) => state.dashboard.couponDeleteModalState);

  const remove = async () => {
    await api.deleteCoupon(selectedCoupon._id);
    toast.success(`${selectedCoupon.couponCode} deleted.`);
    dispatch(setReloadData("coupons"));
  };

  return (
    <ConfirmDialog
      open={isOpen && Boolean(selectedCoupon)}
      onClose={() => dispatch(closeCouponDeleteModal())}
      title="Delete coupon"
      description="Customers can no longer apply it at checkout."
      confirmWord={selectedCoupon?.couponCode || ""}
      confirmLabel="Delete coupon"
      onConfirm={remove}
    >
      {selectedCoupon && (
        <p className="rounded-lg border border-line p-3.5 text-[13px] text-muted">
          <span className="font-mono text-ink">{selectedCoupon.couponCode}</span> · {selectedCoupon.discountPercentage}% off · expires{" "}
          {formatDate(selectedCoupon.expiryDate)} · used {selectedCoupon.totalUsage || 0} times
        </p>
      )}
    </ConfirmDialog>
  );
};

export default DeleteCoupon;
