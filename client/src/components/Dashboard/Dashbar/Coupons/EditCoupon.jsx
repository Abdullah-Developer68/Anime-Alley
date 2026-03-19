import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeCouponEditModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { toast } from "react-toastify";

const EditCoupon = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedCoupon } = useSelector(
    (state) => state.dashboard.couponEditFormState,
  );

  const [formData, setFormData] = useState({
    discountPercentage: 0,
    expiryDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedCoupon) {
      setFormData({
        discountPercentage: selectedCoupon.discountPercentage || 0,
        expiryDate: selectedCoupon.expiryDate
          ? new Date(selectedCoupon.expiryDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [selectedCoupon]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      // This API endpoint will need to be created
      const res = await api.updateCoupon(selectedCoupon._id, formData);
      if (res.data.success) {
        toast.success("Coupon updated successfully!");
        dispatch(setReloadData("coupons"));
        dispatch(closeCouponEditModal());
      } else {
        setError(res.data.message || "Failed to update coupon.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    dispatch(closeCouponEditModal());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Edit Coupon: {selectedCoupon.couponCode}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Discount (%)
            </label>
            <input
              type="number"
              name="discountPercentage"
              value={formData.discountPercentage}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
            />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-black bg-gray-300 rounded-lg cursor-pointer hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-black bg-gray-300 rounded-lg cursor-pointer hover:bg-white"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCoupon;
