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
    (state) => state.dashboard.orderEditFormState,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Edit Order: {selectedOrder.orderID}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
            >
              <option value="pending" className="text-black bg-gray-400">
                Pending
              </option>
              <option value="processing" className="text-black bg-gray-400">
                Processing
              </option>
              <option value="shipped" className="text-black bg-gray-400">
                Shipped
              </option>
              <option value="delivered" className="text-black bg-gray-400">
                Delivered
              </option>
            </select>
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
            {isSaving ? "Saving..." : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrder;
