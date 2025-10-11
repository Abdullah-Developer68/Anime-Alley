import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../../api/api";
import {
  setReloadData,
  closeCouponCreateModal,
} from "../../../../redux/Slice/DashboardSlice";
import { toast } from "react-toastify";

const CreateCoupon = () => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    couponCode: "",
    discountPercentage: "",
    expiryDate: "",
  });
  const [formError, setFormError] = useState("");
  const isOpen = useSelector(
    (state) => state.dashboard.couponCreateModalState?.isOpen
  );

  if (!isOpen) return null;

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const payload = {
        couponCode: form.couponCode,
        discountPercentage: form.discountPercentage,
        expiryDate: form.expiryDate,
      };
      const res = await api.createCoupon(payload);
      if (res.data.success) {
        toast.success("Coupon created successfully!");
        dispatch(closeCouponCreateModal());
        setForm({ couponCode: "", discountPercentage: "", expiryDate: "" });
        dispatch(setReloadData("coupons"));
      } else {
        setFormError(res.data.message || "Failed to create coupon.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create coupon.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleCreateCoupon}
        className="bg-[#18181b] rounded-lg p-8 w-full max-w-md space-y-4 relative border border-white/10 shadow-xl"
      >
        <button
          type="button"
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={() => dispatch(closeCouponCreateModal())}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-2 text-white">Create Coupon</h2>
        {formError && (
          <div className="text-red-400 text-sm mb-2">{formError}</div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Coupon Code
          </label>
          <input
            type="text"
            className="w-full border border-white/10 bg-black/30 text-white rounded px-3 py-2 focus:outline-none focus:border-pink-500"
            value={form.couponCode}
            onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Discount Percentage
          </label>
          <input
            type="number"
            min="1"
            max="100"
            className="w-full border border-white/10 bg-black/30 text-white rounded px-3 py-2 focus:outline-none focus:border-pink-500"
            value={form.discountPercentage}
            onChange={(e) =>
              setForm({ ...form, discountPercentage: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Expiry Date
          </label>
          <input
            type="date"
            className="w-full border border-white/10 bg-black/30 text-white rounded px-3 py-2 focus:outline-none focus:border-pink-500"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded transition-colors"
        >
          Create
        </button>
      </form>
    </div>
  );
};

export default CreateCoupon;
