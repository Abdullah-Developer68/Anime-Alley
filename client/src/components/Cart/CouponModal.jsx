import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  applyCoupon,
  resetCoupon,
  setCartLoading,
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
import Loader from "../Global/Loader";

const CouponModal = () => {
  const dispatch = useDispatch();
  // Redux state
  const couponApplied = useSelector((state) => state.cart.couponApplied);
  const couponCode = useSelector((state) => state.cart.couponCode); // used to display in the input tag after the couponCode is dispatched to the redux store
  const isLoading = useSelector((state) => state.cart.isLoading);
  const couponModalOpen = useSelector((state) => state.cart.couponModalOpen);
  const cartItems = useSelector((state) => state.cart.cartItems);
  const discountedPrice = useSelector((state) => state.cart.discountedPrice);
  const finalTotal = useSelector((state) => state.cart.finalTotal);

  // Calculate subtotal and shipping from Redux state
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.itemQuantity,
    0,
  );
  const shippingCost = 5; // SHIPPING_COST constant

  // Local state
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isProceeding, setIsProceeding] = useState(false);

  const calculateCosts = useCallback(() => {
    if (couponApplied && couponDiscount > 0) {
      // discounted Price
      const newDiscountedPrice = Math.round(
        subtotal * (1 - couponDiscount / 100),
      );
      // Final Total
      const newFinalTotal = Math.round(newDiscountedPrice + shippingCost);
      // update cartSlice
      dispatch(setDiscountedPrice(newDiscountedPrice));
      dispatch(setFinalTotal(newFinalTotal));
    } else {
      //update cartSlice
      dispatch(setDiscountedPrice(subtotal));
      dispatch(setFinalTotal(subtotal + shippingCost));
    }
  }, [couponApplied, couponDiscount, subtotal, shippingCost, dispatch]);

  const resetCouponModalState = useCallback(() => {
    if (couponModalOpen) {
      setCouponInput("");
      if (!couponApplied) {
        setCouponDiscount(0);
        dispatch(setDiscountedPrice(subtotal));
        dispatch(setFinalTotal(subtotal + shippingCost));
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

    try {
      // start loading
      const loadingTimer = setTimeout(() => {
        dispatch(setCartLoading(true)); // shows a loader on screen
      }, 200);

      // find user
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (!userInfo) {
        clearTimeout(loadingTimer);
        dispatch(setCartLoading(false));
        toast.error("Please login to apply coupon");
        return;
      }
      // verify coupon
      const response = await api.verifyCouponCode(couponInput.trim());

      // closes the loader
      clearTimeout(loadingTimer);
      dispatch(setCartLoading(false));

      if (response.success === false) {
        toast.error("Invalid coupon code");
        return;
      }

      const coupon = response.data?.coupondata.coupon;

      if (coupon) {
        const discount = coupon.discountPercentage;
        setCouponDiscount(discount);
        const newDiscountedPrice = Math.round(subtotal * (1 - discount / 100));
        const newFinalTotal = Math.round(newDiscountedPrice + shippingCost);

        dispatch(
          applyCoupon({
            couponCode: couponInput.trim(),
            discountedPrice: newDiscountedPrice,
            finalCost: newFinalTotal,
          }),
        );

        dispatch(setDiscountedPrice(newDiscountedPrice));
        dispatch(setFinalTotal(newFinalTotal));
        toast.success(
          `Coupon applied! You saved $${subtotal - newDiscountedPrice}`,
        );

        // Set proceeding state and automatically proceed with payment
        setIsProceeding(true);
        setTimeout(() => {
          handleProceed();
        }, 1500); // Give user time to see the success message
      } else {
        toast.error("Invalid coupon code");
      }
    } catch (error) {
      dispatch(setCartLoading(false));
      toast.error(error.response?.data?.message || "Error applying coupon");
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(resetCoupon());
    setCouponDiscount(0);
    dispatch(setDiscountedPrice(subtotal));
    dispatch(setFinalTotal(subtotal + shippingCost));
    setCouponInput("");
    toast.success("Coupon removed");
  };

  const handleProceed = () => {
    // Dispatch individual state updates
    dispatch(setDiscountedPrice(discountedPrice));
    dispatch(setFinalTotal(finalTotal));
    dispatch(setOriginalTotal(subtotal + shippingCost));
    dispatch(setDiscountAmount(couponApplied ? subtotal - discountedPrice : 0));

    // Trigger order placement
    dispatch(setShouldProceedWithOrder(true));

    // Close modal
    dispatch(closeCouponModal());
  };

  const handleSkip = () => {
    // Reset coupon if applied
    if (couponApplied) {
      dispatch(resetCoupon());
    }

    // Dispatch individual state updates for no coupon scenario
    dispatch(setDiscountedPrice(subtotal));
    dispatch(setFinalTotal(subtotal + shippingCost));
    dispatch(setOriginalTotal(subtotal + shippingCost));
    dispatch(setDiscountAmount(0));

    // Trigger order placement
    dispatch(setShouldProceedWithOrder(true));

    // Close modal
    dispatch(closeCouponModal());
  };

  const handleClose = () => {
    dispatch(closeCouponModal());
  };

  if (!couponModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 mx-auto border rounded-lg bg-black/95 border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Apply Coupon Code
          </h2>
          <button
            onClick={handleClose}
            className="transition-colors text-white/70 hover:text-white"
          >
            <img src={assets.close} alt="close" className="w-6 h-6" />
          </button>
        </div>

        {/* Coupon Input Section */}
        {!couponApplied && (
          <div className="mb-6 space-y-4">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="w-full px-4 py-3 text-white transition-colors border rounded-lg outline-none bg-white/10 border-white/20 placeholder:text-white/50 focus:border-yellow-500/50"
              disabled={isLoading}
            />
            <button
              onClick={handleApplyCoupon}
              disabled={isLoading || !couponInput.trim()}
              className="flex items-center justify-center w-full gap-2 py-3 font-semibold text-black transition-all duration-300 bg-yellow-500 rounded-lg cursor-pointer hover:bg-yellow-400 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader size="sm" />
                  <span>Validating...</span>
                </>
              ) : (
                "Apply Coupon"
              )}
            </button>
          </div>
        )}

        {/* Applied Coupon Display */}
        {couponApplied && (
          <div className="p-4 mb-6 border rounded-lg bg-green-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-400">Coupon Applied!</p>
                <p className="text-sm text-white/70">Code: {couponCode}</p>
                {isProceeding && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-yellow-400">
                    <span className="animate-pulse">●</span>
                    Proceeding to payment automatically...
                  </p>
                )}
              </div>
              {!isProceeding && (
                <button
                  onClick={handleRemoveCoupon}
                  className="text-sm text-red-400 underline hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {/* Price Summary */}
        <div className="p-4 mb-6 space-y-2 rounded-lg bg-white/5">
          <div className="flex justify-between text-white/70">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Shipping</span>
            <span>${shippingCost}</span>
          </div>
          {couponApplied && couponDiscount > 0 && (
            <>
              <div className="flex justify-between text-sm text-white/50">
                <span>Original Total</span>
                <span className="line-through">${subtotal + shippingCost}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Discount ({couponDiscount}%)</span>
                <span>-${subtotal - discountedPrice}</span>
              </div>
            </>
          )}
          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between text-lg font-bold text-yellow-500">
              <span>Total</span>
              <span>${finalTotal}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!couponApplied && (
          <div className="flex justify-center">
            <button
              onClick={handleSkip}
              className="w-full py-3 font-semibold text-black transition-all duration-300 bg-pink-500 rounded-lg hover:bg-pink-400"
            >
              Skip Coupon & Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponModal;
