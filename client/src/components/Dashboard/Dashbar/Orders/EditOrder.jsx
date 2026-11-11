import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeOrderEditModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { formatMoney } from "../../../../utils/money";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { cx } from "../../../ui/styles";

const STATUSES = ["pending", "processing", "shipped", "delivered"];

const EditOrder = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedOrder } = useSelector((state) => state.dashboard.orderEditFormState);
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedOrder)
      setStatus(selectedOrder.status || "pending");
  }, [selectedOrder]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateOrder(selectedOrder._id, { status });
      toast.success(`${selectedOrder.orderID} is now ${status}.`);
      dispatch(setReloadData("orders"));
      dispatch(closeOrderEditModal());
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update the order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen && Boolean(selectedOrder)}
      onClose={() => dispatch(closeOrderEditModal())}
      busy={saving}
      size="sm"
      title="Order status"
      description={selectedOrder && `${selectedOrder.orderID} · ${formatMoney(selectedOrder.finalAmount)}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => dispatch(closeOrderEditModal())} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || status === selectedOrder?.status}>
            {saving ? "Saving…" : "Save status"}
          </Button>
        </>
      }
    >
      <fieldset className="grid gap-2">
        <legend className="sr-only">Status</legend>
        {STATUSES.map((value, index) => (
          <label
            key={value}
            className={cx(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-[13px] capitalize transition-colors",
              status === value ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong",
            )}
          >
            <input type="radio" name="order-status" value={value} checked={status === value} onChange={() => setStatus(value)} />
            <span className="text-ink">{value}</span>
            <span className="ml-auto text-xs normal-case text-subtle">Step {index + 1} of 4</span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );
};

export default EditOrder;
