import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeCouponEditModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { inputClass, labelClass } from "../../../ui/styles";

const EditCoupon = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedCoupon } = useSelector((state) => state.dashboard.couponEditFormState);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (selectedCoupon)
      reset({
        discountPercentage: selectedCoupon.discountPercentage || "",
        expiryDate: selectedCoupon.expiryDate ? new Date(selectedCoupon.expiryDate).toISOString().split("T")[0] : "",
      });
  }, [selectedCoupon, reset]);

  const close = () => dispatch(closeCouponEditModal());

  const onSubmit = async (form) => {
    try {
      await api.updateCoupon(selectedCoupon._id, {
        discountPercentage: Number(form.discountPercentage),
        ...(form.expiryDate && { expiryDate: form.expiryDate }),
      });
      toast.success(`${selectedCoupon.couponCode} updated.`);
      dispatch(setReloadData("coupons"));
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update the coupon.");
    }
  };

  return (
    <Modal
      open={isOpen && Boolean(selectedCoupon)}
      onClose={close}
      busy={isSubmitting}
      size="sm"
      title="Edit coupon"
      description={selectedCoupon?.couponCode}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-coupon-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="edit-coupon-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="coupon-percent-edit" className={labelClass}>Discount %</label>
          <input
            id="coupon-percent-edit"
            type="number"
            min="1"
            max="100"
            className={inputClass}
            aria-invalid={errors.discountPercentage ? "true" : "false"}
            {...register("discountPercentage", { validate: (value) => (Number(value) >= 1 && Number(value) <= 100) || "1 to 100." })}
          />
          {errors.discountPercentage && <p role="alert" className="mt-1.5 text-xs text-danger">{errors.discountPercentage.message}</p>}
        </div>
        <div>
          <label htmlFor="coupon-expiry-edit" className={labelClass}>Expires</label>
          <input id="coupon-expiry-edit" type="date" className={inputClass} {...register("expiryDate")} />
        </div>
      </form>
    </Modal>
  );
};

export default EditCoupon;
