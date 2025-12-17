import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { emptyCartLocal } from "../redux/Slice/cartSlice";
import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";
import assets from "../assets/asset";
import api from "../api/api";

const Success = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // useParams extracts routes parameters like "/success/:id", but for parameters in query String "?session_id=CHECKOUT_SESSION_ID" use useSearchParams
  const [searchParams] = useSearchParams();
  const session_id = searchParams.get("session_id"); // Not destructure

  const historyRedirect = useCallback(async () => {
    try {
      const res = await api.verifyOrder(session_id);
      if (res?.data?.success) {
        dispatch(emptyCartLocal()); // --> This clears out all info of cart
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
    const timer = setInterval(async () => {
      result = await historyRedirect();
      attempts++;
      // clear interval if the result if true or the maxAttemps have been made.
      if (attempts > maxAttempts || result) {
        clearInterval(timer);
      }
    }, 2000);
  }, [historyRedirect]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#18181b]">
      <div className="bg-[#23232b] rounded-2xl shadow-2xl p-8 sm:p-12 flex flex-col items-center max-w-md w-full mx-4 border border-white/10">
        {/* Checkmark Icon */}
        <div className="bg-green-500 rounded-full p-4 mb-6 shadow-lg animate-bounce">
          <img src={assets.tick} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 text-center drop-shadow-lg">
          Payment Successful!
        </h1>
        <p className="text-lg sm:text-xl text-white/80 text-center mb-6">
          Thank you for your purchase.
          <br />
          Redirecting to your order history...
        </p>
        <div className="w-full h-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default Success;
