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
    (state) => state.dashboard.couponCreateModalState?.isOpen,
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
          className="absolute text-2xl text-gray-400 top-2 right-2 hover:text-white"
          onClick={() => dispatch(closeCouponCreateModal())}
        >
          &times;
        </button>
        <h2 className="mb-2 text-xl font-bold text-white">Create Coupon</h2>
        {formError && (
          <div className="mb-2 text-sm text-red-400">{formError}</div>
        )}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-300">
            Coupon Code
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-white border rounded border-white/10 bg-black/30 focus:outline-none focus:border-pink-500"
            value={form.couponCode}
            onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-300">
            Discount Percentage
          </label>
          <input
            type="number"
            min="1"
            max="100"
            className="w-full px-3 py-2 text-white border rounded border-white/10 bg-black/30 focus:outline-none focus:border-pink-500"
            value={form.discountPercentage}
            onChange={(e) =>
              setForm({ ...form, discountPercentage: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-300">
            Expiry Date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 text-white border rounded border-white/10 bg-black/30 focus:outline-none focus:border-pink-500"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 font-bold text-black transition-colors bg-gray-300 rounded hover:bg-white"
        >
          Create
        </button>
      </form>
    </div>
  );
};

export default CreateCoupon;
