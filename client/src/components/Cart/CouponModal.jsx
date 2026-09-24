import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  applyCoupon,
  resetCoupon,
  closeCouponModal,
  setDiscountedPrice,
  setFinalTotal,
  setOriginalTotal,
  setDiscountAmount,
  setShouldProceedWithOrder,
} from "../../redux/Slice/cartSlice";
import api from "../../api/api";
import { toast } from "react-toastify";
import assets from "../../assets/asset";
import { formatPrice } from "../../utils/formatPrice";

const CouponModal = () => {
  const dispatch = useDispatch();
  // Redux state
  const couponApplied = useSelector((state) => state.cart.couponApplied);
  const couponCode = useSelector((state) => state.cart.couponCode); // used to display in the input tag after the couponCode is dispatched to the redux store
  const couponModalOpen = useSelector((state) => state.cart.couponModalOpen);
  const cartItems = useSelector((state) => state.cart.cartItems);
  const paymentMethod = useSelector((state) => state.cart.paymentMethod);
  const discountedPrice = useSelector((state) => state.cart.discountedPrice);
  const finalTotal = useSelector((state) => state.cart.finalTotal);

  // Calculate subtotal and shipping from Redux state
  const subtotal = formatPrice(
    cartItems.reduce(
      (total, item) => total + (item.price || 0) * item.itemQuantity,
      0,
    ),
  );
  const shippingCost = 5; // SHIPPING_COST constant

  // Local state
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isProceeding, setIsProceeding] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const calculateCosts = useCallback(() => {
    if (couponApplied && couponDiscount > 0) {
      // discounted Price
      const newDiscountedPrice = formatPrice(
        subtotal * (1 - couponDiscount / 100),
      );
      // Final Total
      const newFinalTotal = formatPrice(newDiscountedPrice + shippingCost);
      // update cartSlice
      dispatch(setDiscountedPrice(newDiscountedPrice));
      dispatch(setFinalTotal(newFinalTotal));
    } else {
      //update cartSlice
      dispatch(setDiscountedPrice(subtotal));
      dispatch(setFinalTotal(formatPrice(subtotal + shippingCost)));
    }
  }, [couponApplied, couponDiscount, subtotal, shippingCost, dispatch]);

  const resetCouponModalState = useCallback(() => {
    if (couponModalOpen) {
      setCouponInput("");
      setIsValidating(false);
      setIsSuccess(false);
      setIsProceeding(false);
      if (!couponApplied) {
        setCouponDiscount(0);
        dispatch(setDiscountedPrice(subtotal));
        dispatch(setFinalTotal(formatPrice(subtotal + shippingCost)));
      }
    }
  }, [couponModalOpen, couponApplied, subtotal, shippingCost, dispatch]);

  // Calculate totals when coupon is applied/removed
  useEffect(() => {
    calculateCosts();
  }, [calculateCosts]);

  // Reset modal state when opened
  useEffect(() => {
    resetCouponModalState();
  }, [resetCouponModalState]);

  const handleApplyCoupon = async () => {
    if (couponApplied) {
      toast.error("Coupon has already been applied!");
      return;
    }

    if (!couponInput.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    // find user
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo) {
      toast.error("Please login to apply coupon");
      return;
    }

    try {
      setIsValidating(true);
      const response = await api.verifyCouponCode(couponInput.trim());

      if (response.success === false) {
        setIsValidating(false);
        toast.error("Invalid coupon code");
        return;
      }

      const coupon = response.data?.coupondata.coupon;

      if (coupon) {
        const discount = coupon.discountPercentage;
        setCouponDiscount(discount);
        const newDiscountedPrice = formatPrice(subtotal * (1 - discount / 100));
        const newFinalTotal = formatPrice(newDiscountedPrice + shippingCost);

        // Transition button to success state smoothly
        setIsValidating(false);
        setIsSuccess(true);

        dispatch(setDiscountedPrice(newDiscountedPrice));
        dispatch(setFinalTotal(newFinalTotal));
        toast.success(
          `Coupon applied! You saved $${formatPrice(subtotal - newDiscountedPrice)}`,
        );

        // Keep button success animation visible before switching and proceeding
        setTimeout(() => {
          dispatch(
            applyCoupon({
              couponCode: couponInput.trim(),
              discountedPrice: newDiscountedPrice,
              finalCost: newFinalTotal,
            }),
          );
          setIsProceeding(true);
          setTimeout(() => {
            handleProceed();
          }, 1400);
        }, 800);
      } else {
        setIsValidating(false);
        toast.error("Invalid coupon code");
      }
    } catch (error) {
      setIsValidating(false);
      toast.error(error.response?.data?.message || "Error applying coupon");
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(resetCoupon());
    setCouponDiscount(0);
    setIsValidating(false);
    setIsSuccess(false);
    setIsProceeding(false);
    dispatch(setDiscountedPrice(subtotal));
    dispatch(setFinalTotal(formatPrice(subtotal + shippingCost)));
    setCouponInput("");
    toast.success("Coupon removed");
  };

  const showCheckoutToast = () => {
    if (paymentMethod === "stripe") {
      toast.info("Proceeding to checkout...", { autoClose: 1200 });
      return;
    }

    toast.info("Placing your order...");
  };

  const handleProceed = () => {
    if (cartItems.length === 0) {
      toast.error(
        "Your cart is empty. Add items before proceeding to checkout.",
      );
      return;
    }

    showCheckoutToast();

    // Dispatch individual state updates
    dispatch(setDiscountedPrice(formatPrice(discountedPrice)));
    dispatch(setFinalTotal(formatPrice(finalTotal)));
    dispatch(setOriginalTotal(formatPrice(subtotal + shippingCost)));
    dispatch(setDiscountAmount(couponApplied ? formatPrice(subtotal - discountedPrice) : 0));

    // Trigger order placement
    dispatch(setShouldProceedWithOrder(true));

    // Close modal
    dispatch(closeCouponModal());
  };

  const handleSkip = () => {
    if (cartItems.length === 0) {
      toast.error(
        "Your cart is empty. Add items before proceeding to checkout.",
      );
      return;
    }

    showCheckoutToast();

    // Reset coupon if applied
    if (couponApplied) {
      dispatch(resetCoupon());
    }

    // Dispatch individual state updates for no coupon scenario
    dispatch(setDiscountedPrice(subtotal));
    dispatch(setFinalTotal(formatPrice(subtotal + shippingCost)));
    dispatch(setOriginalTotal(formatPrice(subtotal + shippingCost)));
    dispatch(setDiscountAmount(0));

    // Trigger order placement
    dispatch(setShouldProceedWithOrder(true));

    // Close modal
    dispatch(closeCouponModal());
  };

  if (!couponModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-[#0b0b10] border rounded-2xl border-white/10 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => dispatch(closeCouponModal())}
          className="absolute text-xl transition-colors cursor-pointer top-4 right-4 text-white/50 hover:text-white"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-pink-500/20">
            <img src={assets.tag} alt="Coupon" className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Apply Coupon</h2>
          <p className="mt-1 text-sm text-white/60">
            Enter a coupon code to get discount on your order
          </p>
        </div>

        {/* Coupon Input Form */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              disabled={couponApplied || isValidating || isProceeding}
              className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-pink-500/50 outline-none text-sm uppercase transition-colors disabled:opacity-50"
            />
            {!couponApplied ? (
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={
                  isValidating || !couponInput.trim() || isProceeding || isSuccess
                }
                className={`relative px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 min-w-[90px] flex items-center justify-center overflow-hidden ${
                  isSuccess
                    ? "bg-green-500 text-black shadow-lg shadow-green-500/25"
                    : isValidating
                      ? "bg-pink-500/80 text-black cursor-wait"
                      : !couponInput.trim() || isProceeding
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-pink-500 text-black hover:bg-pink-400 cursor-pointer shadow-md shadow-pink-500/20 hover:shadow-pink-500/30"
                }`}
              >
                {/* Spinner state */}
                {isValidating && (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4 text-black animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span className="text-xs">Checking</span>
                  </span>
                )}

                {/* Success state - smooth pulse */}
                {isSuccess && (
                  <span className="flex items-center gap-1 font-bold animate-pulse">
                    <svg
                      className="w-4 h-4 text-black"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Applied!</span>
                  </span>
                )}

                {/* Default state */}
                {!isValidating && !isSuccess && "Apply"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                disabled={isProceeding}
                className="px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500/30 cursor-pointer transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Applied Coupon Display */}
        {couponApplied && (
          <div className="p-3 mb-6 border rounded-lg bg-green-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-sm font-medium text-green-400">
                  {couponCode} Applied
                </span>
              </div>
              <span className="text-sm font-bold text-green-400">
                {couponDiscount}% OFF
              </span>
            </div>
          </div>
        )}

        {/* Price Summary */}
        <div className="p-4 mb-6 space-y-2 rounded-lg bg-white/5">
          <div className="flex justify-between text-white/70">
            <span>Subtotal</span>
            <span>${formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Shipping</span>
            <span>${formatPrice(shippingCost)}</span>
          </div>
          {couponApplied && couponDiscount > 0 && (
            <>
              <div className="flex justify-between text-sm text-white/50">
                <span>Original Total</span>
                <span className="line-through">${formatPrice(subtotal + shippingCost)}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Discount ({couponDiscount}%)</span>
                <span>-${formatPrice(subtotal - discountedPrice)}</span>
              </div>
            </>
          )}
          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between text-lg font-bold text-yellow-500">
              <span>Total</span>
              <span>${formatPrice(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {couponApplied ? (
            <button
              onClick={handleProceed}
              disabled={isProceeding}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 text-sm flex items-center justify-center gap-2 ${
                isProceeding
                  ? "bg-pink-500/80 text-black cursor-wait"
                  : "bg-pink-500 text-black hover:bg-pink-400 cursor-pointer shadow-lg shadow-pink-500/25"
              }`}
            >
              {isProceeding ? (
                <>
                  <svg
                    className="w-4 h-4 text-black animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                "Proceed to Checkout"
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleSkip}
                className="w-full py-2.5 bg-white/10 text-white font-medium rounded-lg hover:bg-white/15 cursor-pointer transition-colors text-sm"
              >
                Continue without Coupon
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponModal;
