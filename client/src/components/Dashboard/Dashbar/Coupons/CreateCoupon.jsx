import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeCouponCreateModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { inputClass, labelClass } from "../../../ui/styles";

// Same rule as the server: 3 to 40 letters, digits, dashes or underscores
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
const today = () => new Date().toISOString().split("T")[0];

const CreateCoupon = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.dashboard.couponCreateModalState?.isOpen);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { couponCode: "", discountPercentage: "", expiryDate: "" },
  });

  const close = () => {
    reset();
    dispatch(closeCouponCreateModal());
  };

  const onSubmit = async (form) => {
    try {
      await api.createCoupon({
        couponCode: form.couponCode.trim().toUpperCase(),
        discountPercentage: Number(form.discountPercentage),
        // Left empty, the server defaults to 30 days from now
        expiryDate: form.expiryDate || undefined,
      });
      toast.success("Coupon created.");
      dispatch(setReloadData("coupons"));
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't create the coupon.");
    }
  };

  return (
    <Modal
      open={Boolean(isOpen)}
      onClose={close}
      busy={isSubmitting}
      size="sm"
      title="New coupon"
      description="Each customer can use a code once."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-coupon-form" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create coupon"}
          </Button>
        </>
      }
    >
      <form id="create-coupon-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="coupon-code-new" className={labelClass}>Code</label>
          <input
            id="coupon-code-new"
            placeholder="SUMMER25"
            className={`${inputClass} uppercase placeholder:normal-case`}
            aria-invalid={errors.couponCode ? "true" : "false"}
            {...register("couponCode", { pattern: { value: CODE_PATTERN, message: "3 to 40 letters, digits, dashes or underscores." } })}
          />
          {errors.couponCode && <p role="alert" className="mt-1.5 text-xs text-danger">{errors.couponCode.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="coupon-percent-new" className={labelClass}>Discount %</label>
            <input
              id="coupon-percent-new"
              type="number"
              min="1"
              max="100"
              className={inputClass}
              aria-invalid={errors.discountPercentage ? "true" : "false"}
              {...register("discountPercentage", {
                validate: (value) => (Number(value) >= 1 && Number(value) <= 100) || "1 to 100.",
              })}
            />
            {errors.discountPercentage && <p role="alert" className="mt-1.5 text-xs text-danger">{errors.discountPercentage.message}</p>}
          </div>
          <div>
            <label htmlFor="coupon-expiry-new" className={labelClass}>Expires</label>
            <input id="coupon-expiry-new" type="date" min={today()} className={inputClass} {...register("expiryDate")} />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCoupon;
