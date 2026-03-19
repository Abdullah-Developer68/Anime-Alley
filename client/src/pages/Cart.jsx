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
        dispatch(resetCoupon());
        setPaymentMethod("cod");
      } else {
        toast.error(res.data.message || "Failed to place order");
      }
    } catch (error) {
      console.error(error);
      dispatch(setCartLoading(false));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  }, [deliveryAddress, paymentMethod, couponCode, dispatch]);

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
      <span className="inline-flex items-center px-3 py-1 mx-auto mb-2 text-sm font-medium text-pink-400 border rounded-full bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-pink-500/30 w-fit sm:mx-0">
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
      <div className="container p-2 mx-auto mt-16 sm:p-4 md:p-8">
        <div className="relative flex flex-col min-h-screen overflow-hidden bg-black shadow-lg lg:flex-row bg-gradient-to-b rounded-xl lg:min-h-0">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Loader size="lg" />
            </div>
          )}

          {/* Left Section - Cart Items */}
          <div className="w-full lg:w-3/4 p-3 sm:p-4 md:p-8 flex flex-col max-h-[80vh] lg:max-h-[85vh]">
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
                <span className="text-pink-500 transition-colors hover:text-pink-400">
                  Continue Shopping
                </span>
              </Link>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 pr-2 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-white/10">
              {cartItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 mb-4 transition-all duration-300 border sm:mb-6 bg-white/5 rounded-xl sm:p-4 hover:bg-white/10 border-white/10 last:mb-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                    {/* Image Section */}
                    <div className="mx-auto shrink-0 sm:mx-0">
                      <img
                        src={`${item.image}`}
                        alt={item.name}
                        className="object-cover w-24 h-24 transition-transform duration-300 rounded-lg shadow-lg sm:w-32 sm:h-32 hover:scale-105"
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

                        {/* Variant Badge - Moved inside the flex-col container */}
                        {renderVariantBadge(item)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-center gap-4 sm:justify-start">
                        <span className="text-sm text-white/60">Quantity:</span>
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
              ))}
            </div>
          </div>

          {/* Right Section - Order Summary */}
          <div className="w-full lg:w-1/4 bg-white/5 backdrop-blur-sm p-4 sm:p-6 lg:max-h-[85vh] lg:overflow-y-auto h-[440px]">
            <h2 className="mb-4 text-lg font-bold sm:text-xl sm:mb-6 text-white/90">
              Order Summary
            </h2>

            <div className="mb-4 space-y-3 sm:space-y-4 sm:mb-6">
              <div className="flex justify-between text-white/70">
                <span>Items ({cartItems.length})</span>
                <span>{subtotal} $</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Shipping</span>
                <span>{shippingCost} $</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex flex-col items-end">
                  <div className="flex justify-between w-full font-bold text-yellow-500">
                    <span>Total</span>
                    <span>{subtotal + shippingCost} $</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout Section */}
            <div className="space-y-3 sm:space-y-4">
              {/* Delivery Address Section */}
              <input
                type="text"
                placeholder="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => dispatch(setDeliveryAddress(e.target.value))}
                className="w-full px-3 py-2 text-sm text-white transition-colors border rounded-lg outline-none sm:px-4 bg-white/10 border-white/20 placeholder:text-white/50 focus:border-pink-500/50 sm:text-base"
              />

              {/* Payment Method Section */}
              <div className="space-y-2">
                <p className="text-white/70 text-[10px]">
                  Select Payment Method
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() =>
                      dispatch(
                        setPaymentMethod(paymentMethod === "cod" ? "" : "cod"),
                      )
                    }
                    className={`px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer
                      ${
                        paymentMethod === "cod"
                          ? "bg-yellow-500 text-black"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                  >
                    Cash on Delivery
                  </button>

                  <StripeButton />
                </div>
              </div>

              {/* Checkout Button */}
              {paymentMethod == "cod" && (
                <button
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base mt-4 ${
                    paymentMethod
                      ? "bg-pink-500 text-black cursor-pointer hover:shadow-lg hover:shadow-pink-500/25"
                      : "bg-gray-500 text-gray-300 cursor-not-allowed"
                  }`}
                  onClick={handlePlaceOrderClick}
                  disabled={!paymentMethod}
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
