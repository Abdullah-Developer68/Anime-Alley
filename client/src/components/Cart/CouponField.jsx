import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Tag, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/api";
import { applyCoupon, resetCoupon } from "../../redux/Slice/cartSlice";
import Button from "../ui/Button";
import { cx, inputClass } from "../ui/styles";

// Coupon code entry. The server says whether this account can use the code; checkout checks again.
const CouponField = () => {
  const dispatch = useDispatch();
  const coupon = useSelector((state) => state.cart.coupon);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  const apply = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed)
      return;
    setChecking(true);
    try {
      const { data } = await api.verifyCouponCode(trimmed);
      const found = data.coupondata?.coupon;
      dispatch(applyCoupon({ code: found.couponCode, percent: found.discountPercentage }));
      setCode("");
      toast.success(`${found.couponCode} applied: ${found.discountPercentage}% off.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "That code can't be used.");
    } finally {
      setChecking(false);
    }
  };

  if (coupon)
    return (
      <div className="flex items-center justify-between rounded-lg border border-success/25 bg-success-soft px-3 py-2.5 text-[13px] text-success">
        <span className="flex items-center gap-2">
          <Tag aria-hidden="true" className="size-4" />
          <span className="font-medium">{coupon.code}</span>
          <span>· {coupon.percent}% off</span>
        </span>
        <button type="button" aria-label="Remove coupon" onClick={() => dispatch(resetCoupon())} className="rounded-full p-1 transition-colors hover:bg-success/10">
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    );

  return (
    <form onSubmit={apply} className="flex gap-2">
      <label htmlFor="coupon-code" className="sr-only">
        Coupon code
      </label>
      <input
        id="coupon-code"
        value={code}
        maxLength={40}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Coupon code"
        className={cx(inputClass, "uppercase placeholder:normal-case")}
      />
      <Button type="submit" variant="secondary" disabled={checking || !code.trim()} className="h-10">
        {checking ? "Checking…" : "Apply"}
      </Button>
    </form>
  );
};

export default CouponField;
