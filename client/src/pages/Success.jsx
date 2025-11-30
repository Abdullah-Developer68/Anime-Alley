import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { emptyCartLocal } from "../redux/Slice/cartSlice";
import assets from "../assets/asset";

const Success = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  dispatch(emptyCartLocal()); // --> This clears out all info of cart
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/shop");
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);
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
