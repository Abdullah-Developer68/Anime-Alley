import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  resetCoupon,
  setCartLoading,
  openCouponModal,
  setDeliveryAddress,
  setPaymentMethod,
  setShouldProceedWithOrder,
  setFinalTotal,
} from "../redux/Slice/cartSlice";
import { getNewHistoryCounter } from "../redux/Slice/userHistorySlice";
import {
  loadCartFromServer,
  clearCartAsync,
  decrementReservationStockAsync,
  incrementReservationStockAsync,
} from "../redux/Thunk/cartThunks";
import StripeButton from "../components/Cart/StripeButton";
import { useState, useEffect, useCallback } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import Loader from "../components/Global/Loader";
import CouponModal from "../components/Cart/CouponModal";
import { processStripePayment } from "../utils/stripePayment";

const Cart = () => {
  // Redux setup
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const isLoading = useSelector((state) => state.cart.isLoading);
  const isCartLoaded = useSelector((state) => state.cart.isCartLoaded);
  const deliveryAddress = useSelector((state) => state.cart.deliveryAddress);
  const paymentMethod = useSelector((state) => state.cart.paymentMethod);
  // Individual coupon and payment state selectors
  const couponCode = useSelector((state) => state.cart.couponCode);

  const shouldProceedWithOrder = useSelector(
    (state) => state.cart.shouldProceedWithOrder,
  );

  // Constants
  const shippingCost = 5;

  // local State
  const [loadingItems, setLoadingItems] = useState(new Set()); // Track which items are being updated

  // Load cart from server on component mount
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo && !isCartLoaded) {
      // This gets send to the cartThunks to identify the user's cart and load it
      dispatch(loadCartFromServer());
    }
  }, [dispatch, isCartLoaded]);

  // Price calculations
  const calculateSubtotal = () => {
    return Math.round(
      cartItems.reduce(
        (total, item) => total + item.price * item.itemQuantity,
        0,
      ),
    );
  };

  // Calculate subtotal
  const subtotal = calculateSubtotal();

  // Update final cost
  const updateFinalCost = useCallback(() => {
    if (cartItems.length === 0) {
      dispatch(resetCoupon());
      return;
    }

    const totalBeforeDiscount = subtotal + shippingCost;
    dispatch(setFinalTotal(totalBeforeDiscount));
  }, [cartItems, subtotal, shippingCost, dispatch]);

  // Update final cost when cart changes
  useEffect(() => {
    updateFinalCost();
  }, [cartItems, subtotal, shippingCost, updateFinalCost, dispatch]);

  // Open coupon modal before placing order
  const handlePlaceOrderClick = () => {
    if (cartItems.length === 0) {
      toast.error(
        "Your cart is empty. Add items before proceeding to checkout.",
      );
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Store order data and open coupon modal
    dispatch(
      openCouponModal({
        deliveryAddress,
        paymentMethod,
        subtotal,
        shippingCost: shippingCost,
      }),
    );
  };

  // Order placement after coupon modal. This will keep the reference of the function
  // the same across re-rerenders until the values in the dependency array changes
  // (in which case function is again with a new reference).
  const handlePlaceOrder = useCallback(async () => {
    try {
      // Handle Stripe payment separately
      if (paymentMethod === "stripe") {
        if (cartItems.length === 0) {
          toast.error(
            "Your cart is empty. Add items before proceeding to checkout.",
          );
          return;
        }

        const paymentData = {
          couponCode,
          deliveryAddress,
        };
        await processStripePayment(paymentData);
        return; // Stripe will handle the redirect
      }

      // Handle Cash on Delivery
      // Set loading state with a small delay to prevent flickering for fast API calls
      const loadingTimer = setTimeout(() => {
        dispatch(setCartLoading(true));
      }, 200);

      const userInfo = JSON.parse(localStorage.getItem("userInfo"));

      const res = await api.placeOrder(
        couponCode,
        userInfo,
        deliveryAddress,
        paymentMethod,
        userInfo?.id, // Use userId instead of cartId
      );

      // Clear the loading timer since API call completed
      clearTimeout(loadingTimer);
      dispatch(setCartLoading(false));

      if (res.data.success) {
        toast.success("Order placed successfully!");
        // Reset states
        dispatch(clearCartAsync());
        // in here dispatch a state to reload the userorder history
        dispatch(getNewHistoryCounter());
        dispatch(resetCoupon());
        dispatch(setPaymentMethod("cod"));
      } else {
        toast.error(res.data.message || "Failed to place order");
      }
    } catch (error) {
      console.error(error);
      dispatch(setCartLoading(false));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  }, [deliveryAddress, paymentMethod, couponCode, dispatch, cartItems.length]);

  // Watch for shouldProceedWithOrder flag and trigger order placement
  useEffect(() => {
    if (shouldProceedWithOrder) {
      handlePlaceOrder();
      // Reset the flag
      dispatch(setShouldProceedWithOrder(false));
    }
  }, [shouldProceedWithOrder, handlePlaceOrder, dispatch]);

  // Helper function to render variant badge
  const renderVariantBadge = (item) => {
    if (!item.selectedVariant) return null;

    const variantText =
      item.category === "clothes" || item.category === "shoes"
        ? `Size: ${item.selectedVariant}`
        : `Volume: ${item.selectedVariant}`;

    return (
      <span className="inline-flex items-center px-3 py-1 mx-auto mb-2 text-sm font-medium text-pink-400 border rounded-full bg-pink-500/15 border-pink-500/30 w-fit sm:mx-0">
        {variantText}
      </span>
    );
  };

  // Quantity handlers with debouncing and loading states
  const handleIncreaseQuantity = async (item) => {
    const itemKey = `${item._id}-${item.selectedVariant}`;

    // Prevent multiple simultaneous requests for the same item
    if (loadingItems.has(itemKey)) {
      return;
    }

    // Add item to loading state
    setLoadingItems((prev) => new Set([...prev, itemKey]));

    try {
      await dispatch(
        incrementReservationStockAsync({
          id: item._id,
          variant: item.selectedVariant,
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err);
    } finally {
      // Remove item from loading state after request completes
      setLoadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleDecreaseQuantity = async (item) => {
    const itemKey = `${item._id}-${item.selectedVariant}`;

    // Prevent multiple simultaneous requests for the same item
    if (loadingItems.has(itemKey)) {
      return;
    }

    // Add item to loading state
    setLoadingItems((prev) => new Set([...prev, itemKey]));

    try {
      await dispatch(
        decrementReservationStockAsync({
          id: item._id,
          variant: item.selectedVariant,
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err);
    } finally {
      // Remove item from loading state after request completes
      setLoadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  // Show loading state while cart is being loaded
  if (!isCartLoaded && isLoading) {
    return <Loader />;
  }

  // Render Component
  return (
    <>
      <div className="container p-2 mx-auto mt-16 sm:p-4 md:p-8 max-w-7xl">
        <div className="relative flex flex-col bg-[#0b0b10] border border-white/10 shadow-2xl rounded-2xl overflow-hidden lg:flex-row">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Loader size="lg" />
            </div>
          )}

          {/* Left Section - Cart Items */}
          <div className="w-full lg:w-[65%] p-4 sm:p-6 md:p-8 flex flex-col min-h-0">
            {/* Cart Header */}
            <h2 className="mb-4 text-xl font-bold sm:text-2xl sm:mb-6 text-white/90">
              Shopping Cart
            </h2>

            {/* Cart Summary & Continue Shopping */}
            <div className="flex flex-col pb-4 mb-4 border-b sm:flex-row sm:justify-between sm:items-center border-white/10 sm:mb-6">
              <span className="mb-2 text-base sm:text-lg text-white/70 sm:mb-0">
                Items: {cartItems.length}
              </span>
              <Link to="/shop">
                <span className="text-pink-500 transition-colors hover:text-pink-400 font-medium">
                  Continue Shopping
                </span>
              </Link>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 pr-1 sm:pr-2 overflow-y-auto max-h-[65vh] space-y-4 pb-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg text-white/60 mb-4">Your cart is empty</p>
                  <Link
                    to="/shop"
                    className="px-6 py-2.5 text-sm font-semibold text-black transition-all bg-pink-500 rounded-lg hover:bg-pink-400"
                  >
                    Explore Products
                  </Link>
                </div>
              ) : (
                cartItems.map((item, index) => {
                  const isFirstVisibleItem = index === 0;

                  return (
                    <div
                      key={index}
                      className="p-3.5 sm:p-4 transition-all duration-300 border bg-white/5 rounded-xl hover:bg-white/10 border-white/10"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                        {/* Image Section */}
                        <div className="mx-auto shrink-0 sm:mx-0">
                          <img
                            src={`${item.image}`}
                            alt={item.name}
                            fetchPriority={isFirstVisibleItem ? "high" : "auto"}
                            loading={isFirstVisibleItem ? "eager" : "lazy"}
                            className="object-cover w-24 h-24 transition-transform duration-300 rounded-lg shadow-lg sm:w-28 sm:h-28 hover:scale-105"
                          />
                        </div>

                        {/* Details Section */}
                        <div className="flex-grow w-full space-y-2 sm:space-y-3">
                          <div className="flex flex-col w-full">
                            <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:justify-between sm:items-start sm:gap-0">
                              <h3 className="text-lg font-medium text-center transition-colors sm:text-xl text-white/90 hover:text-pink-500 sm:text-left">
                                {item.name}
                              </h3>
                              <p className="text-base font-bold text-center text-white sm:text-lg sm:text-right">
                                <span className="p-1 text-xs font-bold text-black bg-yellow-500 rounded-md">
                                  {item.price * item.itemQuantity} $
                                </span>
                              </p>
                            </div>

                            {/* Variant Badge */}
                            {renderVariantBadge(item)}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-center gap-4 sm:justify-start">
                            <span className="text-sm text-white/60">
                              Quantity:
                            </span>
                            <div className="flex items-center overflow-hidden border rounded-lg border-white/20 bg-black/40">
                              <button
                                className={`px-4 py-2 text-white/90 hover:bg-pink-500/20 transition-colors ${
                                  loadingItems.has(
                                    `${item._id}-${item.selectedVariant}`,
                                  )
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                                onClick={() => handleDecreaseQuantity(item)}
                                disabled={loadingItems.has(
                                  `${item._id}-${item.selectedVariant}`,
                                )}
                              >
                                {loadingItems.has(
                                  `${item._id}-${item.selectedVariant}`,
                                )
                                  ? "..."
                                  : "-"}
                              </button>
                              <span className="w-12 font-medium text-center text-white">
                                {item.itemQuantity}
                              </span>
                              <button
                                className={`px-4 py-2 text-white/90 hover:bg-pink-500/20 transition-colors ${
                                  loadingItems.has(
                                    `${item._id}-${item.selectedVariant}`,
                                  )
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                                onClick={() => handleIncreaseQuantity(item)}
                                disabled={loadingItems.has(
                                  `${item._id}-${item.selectedVariant}`,
                                )}
                              >
                                {loadingItems.has(
                                  `${item._id}-${item.selectedVariant}`,
                                )
                                  ? "..."
                                  : "+"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Section - Order Summary */}
          <div className="w-full lg:w-[35%] bg-white/[0.03] border-t lg:border-t-0 lg:border-l border-white/10 p-4 sm:p-6 md:p-8 flex flex-col justify-between self-stretch">
            <div>
              <h2 className="mb-4 text-lg font-bold sm:text-xl sm:mb-6 text-white/90">
                Order Summary
              </h2>

              <div className="mb-6 space-y-3 sm:space-y-4">
                <div className="flex justify-between text-white/70 text-sm sm:text-base">
                  <span>Items ({cartItems.length})</span>
                  <span>{subtotal} $</span>
                </div>
                <div className="flex justify-between text-white/70 text-sm sm:text-base">
                  <span>Shipping</span>
                  <span>{shippingCost} $</span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between w-full font-bold text-yellow-500 text-base sm:text-lg">
                    <span>Total</span>
                    <span>{subtotal + shippingCost} $</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout Section */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              {/* Delivery Address Section */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Delivery Address
                </label>
                <input
                  type="text"
                  placeholder="Enter your delivery address"
                  value={deliveryAddress}
                  onChange={(e) => dispatch(setDeliveryAddress(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm text-white transition-colors border rounded-lg outline-none bg-white/10 border-white/20 placeholder:text-white/40 focus:border-pink-500/50"
                />
              </div>

              {/* Payment Method Section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/70">
                  Select Payment Method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(
                        setPaymentMethod(paymentMethod === "cod" ? "" : "cod"),
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center text-center cursor-pointer border ${
                      paymentMethod === "cod"
                        ? "bg-yellow-500 text-black border-yellow-500 font-semibold shadow-md shadow-yellow-500/20"
                        : "bg-white/10 text-white/80 border-white/10 hover:bg-white/15"
                    }`}
                  >
                    Cash on Delivery
                  </button>

                  <StripeButton />
                </div>
              </div>

              {/* Checkout Button */}
              {paymentMethod === "cod" && (
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base mt-2 ${
                    paymentMethod && cartItems.length > 0
                      ? "bg-pink-500 text-black cursor-pointer hover:shadow-lg hover:shadow-pink-500/25 hover:bg-pink-400"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={handlePlaceOrderClick}
                  disabled={!paymentMethod || cartItems.length === 0}
                >
                  Place Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      <CouponModal />
    </>
  );
};

export default Cart;
