import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeOrderEditModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { toast } from "react-toastify";

const EditOrder = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedOrder } = useSelector(
    (state) => state.dashboard.orderEditFormState
  );

  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedOrder) {
      setStatus(selectedOrder.status || "pending");
    }
  }, [selectedOrder]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      // This API endpoint will need to be created
      const res = await api.updateOrder(selectedOrder._id, { status });
      if (res.data.success) {
        toast.success("Order updated successfully!");
        dispatch(setReloadData("orders"));
        dispatch(closeOrderEditModal());
      } else {
        setError(res.data.message || "Failed to update order.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    dispatch(closeOrderEditModal());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">
          Edit Order: {selectedOrder.orderID}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="pending" className="bg-gray-400 text-black">
                Pending
              </option>
              <option value="processing" className="bg-gray-400 text-black">
                Processing
              </option>
              <option value="shipped" className="bg-gray-400 text-black">
                Shipped
              </option>
              <option value="delivered" className="bg-gray-400 text-black">
                Delivered
              </option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-300 hover:bg-white text-black rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-300 hover:bg-white text-black rounded-lg cursor-pointer"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrder;
