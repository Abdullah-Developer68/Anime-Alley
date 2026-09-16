import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { emptyCartLocal } from "../redux/Slice/cartSlice";
import assets from "../assets/asset";
import api from "../api/api";

const Success = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Extract session_id query parameter from Stripe redirect URL
  const [searchParams] = useSearchParams();
  const session_id = searchParams.get("session_id");
  const [timedOut, setTimedOut] = useState(false);

  const historyRedirect = useCallback(async () => {
    if (!session_id) return false;
    try {
      const res = await api.verifyOrder(session_id);
      if (res?.data?.success) {
        dispatch(emptyCartLocal()); // Clears local cart state after confirmed order
        navigate("/history");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error verifying order:", error);
      return false;
    }
  }, [session_id, dispatch, navigate]);

  useEffect(() => {
    const maxAttempts = 10;
    let attempts = 0;
    let result = false;

    // Immediately check once upon mounting
    historyRedirect().then((succeeded) => {
      if (succeeded) return;
    });

    const timer = setInterval(async () => {
      result = await historyRedirect();
      attempts++;
      if (result) {
        clearInterval(timer);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        setTimedOut(true);
      }
    }, 2000);

    // Clean up timer on unmount to prevent memory leaks
    return () => clearInterval(timer);
  }, [historyRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#18181b]">
      <div className="bg-[#23232b] rounded-2xl shadow-2xl p-8 sm:p-12 flex flex-col items-center max-w-md w-full mx-4 border border-white/10">
        {/* Checkmark Icon */}
        <div className="p-4 mb-6 bg-green-500 rounded-full shadow-lg animate-bounce">
          <img src={assets.tick} alt="Success" />
        </div>
        <h1 className="mb-3 text-3xl font-extrabold text-center text-white sm:text-4xl drop-shadow-lg">
          Payment Successful!
        </h1>
        {timedOut ? (
          <>
            <p className="mb-6 text-center text-white/80">
              Your payment was received and your order is being finalized.
              It will appear in your order history shortly.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate("/history")}
                className="px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition"
              >
                View Order History
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-sm font-semibold text-white/80 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                Home
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-6 text-lg text-center sm:text-xl text-white/80">
              Thank you for your purchase.
              <br />
              Redirecting to your order history...
            </p>
            <div className="w-full h-2 rounded-full bg-green-500 animate-pulse" />
          </>
        )}
      </div>
    </div>
  );
};

export default Success;
