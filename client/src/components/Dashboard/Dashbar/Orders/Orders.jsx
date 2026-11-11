import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import assets from "../../../../assets/asset";
import {
  openExportModal,
  openOrderEditModal,
  openOrderDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import EditOrder from "./EditOrder";
import DeleteOrder from "./DeleteOrder";
import { Download, RefreshCw } from "lucide-react";
import DashboardPagination from "../../DashboardPagination";
import DataTable, { Avatar, RowActions, StatusDot, Stacked } from "../../DataTable";
import { PageHeader, StatCard, ToolbarButton } from "../../DashboardUI";
import { formatMoney } from "../../../../utils/formatPrice";
import { formatDate } from "../../../../utils/formatDate";

const STATUS_TONE = { pending: "warning", processing: "info", shipped: "accent", delivered: "success" };

const STAT_CARDS = [
  { key: "pending", label: "Pending", icon: assets.pending },
  { key: "processing", label: "Processing", icon: assets.processing },
  { key: "shipped", label: "Shipped", icon: assets.shipped },
  { key: "delivered", label: "Delivered", icon: assets.delivered },
];

const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);

const itemCount = (order) =>
  (order.products || []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

const ORDER_COLUMNS = [
  {
    key: "order",
    header: "Order",
    render: (order) => (
      <Stacked title={order.orderID} subtitle={formatDate(order.createdAt || order.orderDate)} />
    ),
  },
  {
    key: "customer",
    header: "Customer",
    width: "w-[30%]",
    wideOnCard: true,
    render: (order) => (
      <Stacked
        leading={<Avatar src={order.user?.profilePic} name={order.user?.username} />}
        title={order.user?.username || "Deleted user"}
        subtitle={order.user?.email}
      />
    ),
  },
  {
    key: "items",
    header: "Items",
    align: "right",
    render: (order) => <span className="tabular-nums text-ink-200">{itemCount(order)}</span>,
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    render: (order) => (
      <div>
        <p className="font-medium tabular-nums">{formatMoney(order.finalAmount)}</p>
        {order.discount > 0 && (
          <p className="text-xs tabular-nums text-ink-400">
            −{formatMoney(order.discount)}
            {order.couponCode && ` · ${order.couponCode}`}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (order) => (
      <StatusDot tone={STATUS_TONE[order.status] || "neutral"}>{capitalize(order.status)}</StatusDot>
    ),
  },
];

const Orders = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [orders, setOrders] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderStats, setOrderStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  // selectes where to reload data or not
  const reloadDataType = useSelector((state) => state.dashboard.reloadData);

  // Fetch orders for the current page
  const loadOrders = useCallback(
    async (page = 1) => {
      if (!user?.email) return;
      setLoading(true);
      setError("");
      try {
        const res = await api.getAllOrdersList(page);
        if (res.data.success) {
          setOrders(res.data.currPageOrders);
          setTotalPages(res.data.totalPages);
          setTotalOrders(res.data.totalOrders);
        } else {
          setOrders([]);
          setTotalPages(1);
          setTotalOrders(0);
          setError(res.data.message || "Failed to fetch orders");
        }
      } catch (err) {
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
        setError(err.response?.data?.message || "Failed to fetch orders");
      } finally {
        setLoading(false);
      }
    },
    [user?.email],
  );

  // Fetch order status stats
  const fetchOrderStats = async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await api.getOrderStats();
      if (res.data.success) {
        setOrderStats(res.data.stats);
      } else {
        setOrderStats({});
        setStatsError(res.data.message || "Failed to fetch stats");
      }
    } catch (err) {
      setOrderStats({});
      setStatsError(err.response?.data?.message || "Failed to fetch stats");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(currPage);
    fetchOrderStats();
    const interval = setInterval(fetchOrderStats, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [currPage, loadOrders]);

  useEffect(() => {
    if (reloadDataType === "orders") {
      loadOrders(currPage);
      fetchOrderStats();
      dispatch(setReloadData(null)); // tells the dashboardSlice to mark the reload as done and not trigger any more reloads
    }
  });

  // Pagination handler
  const handlePg = (value) => {
    let newPage;
    if (value === "next" && currPage < totalPages) {
      newPage = currPage + 1;
    } else if (value === "prev" && currPage > 1) {
      newPage = currPage - 1;
    } else if (typeof value === "number") {
      newPage = value;
    } else {
      return;
    }
    setCurrPage(newPage);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <EditOrder />
      <DeleteOrder />

      <PageHeader title="Orders" subtitle={loading ? "Loading orders…" : `${totalOrders} orders in total`}>
        <ToolbarButton
          icon={RefreshCw}
          label="Refresh"
          spin={statsLoading}
          disabled={statsLoading}
          onClick={fetchOrderStats}
        />
        <ToolbarButton icon={Download} label="Export" onClick={() => dispatch(openExportModal("orders"))} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.key} label={card.label} value={orderStats[card.key] || 0} icon={card.icon} />
        ))}
      </div>
      {statsError && <p className="text-sm text-red-300">{statsError}</p>}

      <DataTable
        label="Orders"
        columns={ORDER_COLUMNS}
        rows={orders}
        rowKey={(order) => order._id}
        loading={loading}
        error={error}
        emptyMessage="No orders yet."
        actions={(order) => (
          <RowActions
            name={`order ${order.orderID}`}
            onEdit={() => dispatch(openOrderEditModal(order))}
            onDelete={() => dispatch(openOrderDeleteModal(order))}
          />
        )}
      />

      <DashboardPagination
        currPage={currPage}
        totalPages={totalPages}
        totalItems={totalOrders}
        itemCount={orders.length}
        pageSize={20}
        label="orders"
        onPageChange={handlePg}
      />
    </div>
  );
};

export default Orders;
