import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Banknote, CreditCard, Lock } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/api";
import { emptyCartLocal, setDeliveryAddress, setPaymentMethod } from "../../redux/Slice/cartSlice";
import { getNewHistoryCounter } from "../../redux/Slice/userHistorySlice";
import { processStripePayment } from "../../utils/stripePayment";
import { formatPrice } from "../../utils/formatPrice";
import { formatMoney } from "../../utils/money";
import CouponField from "./CouponField";
import Button from "../ui/Button";
import { cx, labelClass, panelClass, textareaClass } from "../ui/styles";

const SHIPPING_COST = 5;
const MAX_ADDRESS_LENGTH = 300;

const METHODS = [
  { id: "stripe", label: "Card", hint: "Secure Stripe Checkout", icon: CreditCard },
  { id: "cod", label: "Cash on delivery", hint: "Pay when it arrives", icon: Banknote },
];

// Totals, coupon, address and payment, then one button that places the order
const OrderSummary = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartItems, coupon, deliveryAddress, paymentMethod } = useSelector((state) => state.cart);
  const [placing, setPlacing] = useState(false);

  // Shown for clarity only; the server recalculates every amount from current prices
  const subtotal = formatPrice(cartItems.reduce((sum, item) => sum + (item.price || 0) * item.itemQuantity, 0));
  const discount = coupon ? formatPrice(subtotal * (coupon.percent / 100)) : 0;
  const total = formatPrice(subtotal - discount + SHIPPING_COST);
  const address = deliveryAddress.trim();

  const placeOrder = async () => {
    if (!address)
      return toast.error("Add a delivery address first.");
    setPlacing(true);
    try {
      if (paymentMethod === "stripe") {
        // Leaves the site for Stripe; the success page picks up from there
        await processStripePayment({ couponCode: coupon?.code || "", deliveryAddress: address });
        return;
      }
      await api.placeOrder(coupon?.code || "", address, "cod");
      dispatch(emptyCartLocal());
      dispatch(getNewHistoryCounter());
      toast.success("Order placed. Pay when it arrives.");
      navigate("/history");
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || error.message || "Something went wrong.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className={cx(panelClass, "p-5 sm:p-6")}>
      <h2 className="text-[15px] font-medium text-ink">Order summary</h2>

      <dl className="mt-4 space-y-2.5 text-[13px]">
        <div className="flex justify-between text-muted">
          <dt>Subtotal</dt>
          <dd className="tabular-nums text-ink">{formatMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-muted">
          <dt>Shipping</dt>
          <dd className="tabular-nums text-ink">{formatMoney(SHIPPING_COST)}</dd>
        </div>
        {coupon && (
          <div className="flex justify-between text-success">
            <dt>Discount ({coupon.percent}%)</dt>
            <dd className="tabular-nums">−{formatMoney(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-3 text-[15px] font-medium text-ink">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(total)}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <CouponField />
      </div>

      <div className="mt-6">
        <label htmlFor="delivery-address" className={labelClass}>
          Delivery address
        </label>
        <textarea
          id="delivery-address"
          rows={3}
          maxLength={MAX_ADDRESS_LENGTH}
          value={deliveryAddress}
          onChange={(e) => dispatch(setDeliveryAddress(e.target.value))}
          placeholder="House, street, city, postcode"
          className={textareaClass}
        />
      </div>

      <fieldset className="mt-5">
        <legend className={labelClass}>Payment</legend>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map(({ id, label, hint, icon: Icon }) => (
            <label
              key={id}
              className={cx(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors",
                paymentMethod === id ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input type="radio" name="payment" value={id} checked={paymentMethod === id} onChange={() => dispatch(setPaymentMethod(id))} className="sr-only" />
              <Icon aria-hidden="true" className="size-4 text-ink" />
              <span className="text-[13px] font-medium text-ink">{label}</span>
              <span className="text-[11.5px] text-muted">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button size="lg" className="mt-6 w-full" onClick={placeOrder} disabled={placing || cartItems.length === 0}>
        {placing ? "Working…" : paymentMethod === "stripe" ? `Continue to payment · ${formatMoney(total)}` : `Place order · ${formatMoney(total)}`}
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-subtle">
        <Lock aria-hidden="true" className="size-3" />
        Card details are entered on Stripe, never here
      </p>
    </div>
  );
};

export default OrderSummary;
