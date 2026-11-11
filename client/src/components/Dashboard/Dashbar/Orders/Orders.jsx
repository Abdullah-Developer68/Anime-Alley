import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Clock, Download, PackageCheck, Pencil, RefreshCw, Trash2, Truck, Loader } from "lucide-react";
import api from "../../../../api/api";
import { openExportModal, openOrderDeleteModal, openOrderEditModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { formatDate, formatMoney } from "../../../../utils/money";
import EditOrder from "./EditOrder";
import DeleteOrder from "./DeleteOrder";
import PageHeader from "../../shared/PageHeader";
import StatCard from "../../shared/StatCard";
import DemoNotice from "../../shared/DemoNotice";
import { READ_ONLY_TITLE, useReadOnly } from "../../shared/readOnly";
import { emptyCellClass, rowClass, tableClass, tableWrapClass, tdClass, thClass } from "../../shared/tableStyles";
import Avatar from "../../../ui/Avatar";
import Badge from "../../../ui/Badge";
import Button from "../../../ui/Button";
import Pagination from "../../../ui/Pagination";
import { ORDER_STATUS_TONES, cx } from "../../../ui/styles";

const STATS = [
  { key: "pending", label: "Pending", icon: Clock, tone: "warning" },
  { key: "processing", label: "Processing", icon: Loader, tone: "info" },
  { key: "shipped", label: "Shipped", icon: Truck, tone: "violet" },
  { key: "delivered", label: "Delivered", icon: PackageCheck, tone: "success" },
];

// "Survey Corps hoodie (M) ×2, +1 more"
const itemsSummary = (products = []) => {
  const [first, ...rest] = products;
  if (!first)
    return "—";
  const name = first.name || first.productId?.name || "Removed product";
  const variant = first.variant && first.variant !== "Default" ? ` (${first.variant})` : "";
  return `${name}${variant} ×${first.quantity}${rest.length ? `, +${rest.length} more` : ""}`;
};

const Orders = () => {
  const dispatch = useDispatch();
  const readOnly = useReadOnly();
  const reloadData = useSelector((state) => state.dashboard.reloadData);
  const [orders, setOrders] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  const loadOrders = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.getAllOrdersList(page);
      setOrders(data.currPageOrders);
      setTotalPages(data.totalPages);
      setTotalOrders(data.totalOrders);
    } catch (err) {
      setOrders([]);
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.getOrderStats();
      setStats(data.stats || {});
    } catch (err) {
      console.error("Failed to fetch order stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(currPage);
  }, [currPage, loadOrders]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Edits and deletes ask for a reload through Redux
  useEffect(() => {
    if (reloadData !== "orders")
      return;
    loadOrders(currPage);
    loadStats();
    dispatch(setReloadData(null));
  }, [reloadData, currPage, loadOrders, loadStats, dispatch]);

  return (
    <div className="space-y-6">
      <EditOrder />
      <DeleteOrder />

      <PageHeader title="Orders" description={`${totalOrders} orders, newest first`}>
        <Button variant="secondary" size="sm" onClick={loadStats} disabled={statsLoading}>
          <RefreshCw aria-hidden="true" className={cx("size-3.5", statsLoading && "animate-spin")} />
          Refresh
        </Button>
        <Button variant="secondary" size="sm" onClick={() => dispatch(openExportModal("orders"))} disabled={readOnly} title={readOnly ? READ_ONLY_TITLE : undefined}>
          <Download aria-hidden="true" className="size-3.5" />
          Export
        </Button>
      </PageHeader>

      <DemoNotice />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STATS.map(({ key, label, icon, tone }, index) => (
          <StatCard key={key} label={label} value={stats[key] || 0} icon={icon} tone={tone} index={index} />
        ))}
      </div>

      <div className={tableWrapClass}>
        <table className={cx(tableClass, "min-w-[980px]")}>
          <thead>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Items</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Payment</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Status</th>
              <th className={cx(thClass, "text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={emptyCellClass}>Loading orders…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className={cx(emptyCellClass, "text-danger")}>{error}</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className={emptyCellClass}>No orders yet.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className={rowClass}>
                  <td className={cx(tdClass, "font-medium whitespace-nowrap text-ink")}>{order.orderID}</td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2.5">
                      <Avatar src={order.user?.profilePic} name={order.user?.username} className="size-7" />
                      <div className="min-w-0">
                        <p className="max-w-[160px] truncate text-ink">{order.user?.username || "Deleted account"}</p>
                        <p className="max-w-[160px] truncate text-xs text-subtle">{order.user?.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cx(tdClass, "max-w-[220px] truncate")} title={itemsSummary(order.products)}>
                    {itemsSummary(order.products)}
                  </td>
                  <td className={cx(tdClass, "whitespace-nowrap")}>{formatDate(order.createdAt || order.orderDate)}</td>
                  <td className={cx(tdClass, "whitespace-nowrap")}>{order.paymentMethod === "stripe" ? "Card" : "Cash"}</td>
                  <td className={cx(tdClass, "whitespace-nowrap tabular-nums text-ink")}>
                    {formatMoney(order.finalAmount)}
                    {order.couponCode && <span className="block text-xs text-success">{order.couponCode}</span>}
                  </td>
                  <td className={tdClass}>
                    <Badge tone={ORDER_STATUS_TONES[order.status]}>{order.status}</Badge>
                  </td>
                  <td className={cx(tdClass, "text-right")}>
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${order.orderID}`} title={readOnly ? READ_ONLY_TITLE : "Change status"} disabled={readOnly} onClick={() => dispatch(openOrderEditModal(order))}>
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${order.orderID}`} title={readOnly ? READ_ONLY_TITLE : "Delete"} disabled={readOnly} onClick={() => dispatch(openOrderDeleteModal(order))}>
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Pagination page={currPage} totalPages={totalPages} onPageChange={setCurrPage} label="Order pages" />
      </div>
    </div>
  );
};

export default Orders;
