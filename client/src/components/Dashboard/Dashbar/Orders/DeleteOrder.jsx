import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeOrderDeleteModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { formatDate, formatMoney } from "../../../../utils/money";
import ConfirmDialog from "../../shared/ConfirmDialog";

const DeleteOrder = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedOrder } = useSelector((state) => state.dashboard.orderDeleteModalState);

  const remove = async () => {
    await api.deleteOrder(selectedOrder._id);
    toast.success(`${selectedOrder.orderID} deleted.`);
    dispatch(setReloadData("orders"));
  };

  return (
    <ConfirmDialog
      open={isOpen && Boolean(selectedOrder)}
      onClose={() => dispatch(closeOrderDeleteModal())}
      title="Delete order"
      description="The customer will no longer see it in their history."
      confirmWord="DELETE"
      confirmLabel="Delete order"
      onConfirm={remove}
    >
      {selectedOrder && (
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3.5 text-[13px]">
          <div>
            <dt className="text-subtle">Order</dt>
            <dd className="text-ink">{selectedOrder.orderID}</dd>
          </div>
          <div>
            <dt className="text-subtle">Customer</dt>
            <dd className="truncate text-ink">{selectedOrder.user?.username || "Deleted account"}</dd>
          </div>
          <div>
            <dt className="text-subtle">Placed</dt>
            <dd className="text-ink">{formatDate(selectedOrder.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-subtle">Total</dt>
            <dd className="tabular-nums text-ink">{formatMoney(selectedOrder.finalAmount)}</dd>
          </div>
        </dl>
      )}
    </ConfirmDialog>
  );
};

export default DeleteOrder;
