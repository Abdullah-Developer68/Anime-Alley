import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import assets from "../../../../assets/asset";
import {
  openExportModal,
  openOrderEditModal,
  openOrderDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import { useSelector } from "react-redux";
import EditOrder from "./EditOrder";
import DeleteOrder from "./DeleteOrder";

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

  // Helper to format date as DD-MM-YYYY
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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
      const res = await api.get("/order/orderStats");
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
    <div className="p-6 space-y-6">
      <EditOrder />
      <DeleteOrder />
      {/* Header Section */}
      <div className="flex max-[362px]:flex-col flex-row justify-between max-[362px]:justify-center max-[362px]:items-end gap-4">
        <h1 className="text-2xl font-bold text-white ml-20">Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch(openExportModal("orders"))}
            className="px-4 py-2 bg-gray-300 hover:bg-white text-black cursor-pointer rounded-lg transition-colors"
          >
            Export
          </button>
          <button
            onClick={fetchOrderStats}
            className="px-4 py-2 bg-gray-300 hover:bg-white text-black cursor-pointer rounded-lg transition-colors"
            disabled={statsLoading}
            title="Refresh Stats"
          >
            {statsLoading ? "Refreshing..." : "Refresh Stats"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Orders */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending Orders</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {orderStats.pending || 0}
              </h3>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <img src={assets.pending} />
            </div>
          </div>
        </div>
        {/* Processing Orders */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Processing Orders</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {orderStats.processing || 0}
              </h3>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <img src={assets.processing} />
            </div>
          </div>
        </div>
        {/* Shipped Orders */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Shipped Orders</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {orderStats.shipped || 0}
              </h3>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <img src={assets.shipped} />
            </div>
          </div>
        </div>
        {/* Delivered Orders */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Delivered Orders</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {orderStats.delivered || 0}
              </h3>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <img src={assets.delivered} />
            </div>
          </div>
        </div>
      </div>
      {statsError && (
        <div className="text-red-400 text-sm mt-2">{statsError}</div>
      )}

      {/* Orders Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="relative overflow-x-auto max-h-[400px]">
          <table className="w-full min-w-[900px]">
            <thead className="bg-black/50 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Actions
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Coupon Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Discount
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    Loading orders...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-red-400"
                  >
                    {error}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex justify-start gap-2">
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 bg-gray-300 hover:bg-white rounded-lg transition-colors"
                          title="Edit"
                          onClick={() => dispatch(openOrderEditModal(order))}
                        >
                          <img
                            src={assets.edit}
                            className="w-5 h-5 cursor-pointer"
                            alt="Edit"
                          />
                        </button>
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 bg-gray-300 hover:bg-white rounded-lg transition-colors"
                          title="Delete"
                          onClick={() => dispatch(openOrderDeleteModal(order))}
                        >
                          <img
                            src={assets.deleteIcon}
                            className="w-5 h-5 cursor-pointer"
                            alt="Delete"
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {order.orderID}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center overflow-hidden">
                          <img
                            src={
                              order.user?.profilePic
                                ? order.user.profilePic.startsWith("http")
                                  ? order.user.profilePic
                                  : order.user.profilePic
                                : assets.defaultProfile
                            }
                            alt={order.user?.username}
                            className="w-8 h-8 object-cover rounded-full"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = assets.defaultProfile;
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {order.user?.username || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {order.user?.email || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {formatDate(order.createdAt || order.orderDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      ${order.finalAmount}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {order.couponCode || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      ${order.discount || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${
                          order.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : order.status === "processing"
                              ? "bg-blue-500/20 text-blue-500"
                              : order.status === "shipped"
                                ? "bg-purple-500/20 text-purple-500"
                                : order.status === "delivered"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-gray-500/20 text-gray-500"
                        }`}
                      >
                        {order.status?.charAt(0).toUpperCase() +
                          order.status?.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-400">
          {orders.length > 0
            ? `Showing ${(currPage - 1) * 20 + 1} to ${
                (currPage - 1) * 20 + orders.length
              } of ${totalOrders} orders`
            : "No orders found"}
        </p>
        <div className="flex gap-2">
          <button
            className={`cursor-pointer px-3 py-1 rounded-lg ${
              currPage === 1
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-white/5 text-white hover:bg-white/10"
            } transition-colors`}
            onClick={() => handlePg("prev")}
            disabled={currPage === 1}
          >
            Previous
          </button>
          {totalPages > 0 &&
            [...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                className={`px-3 py-1 rounded-lg ${
                  currPage === index + 1
                    ? "text-black bg-white"
                    : "text-white bg-gray-600 hover:bg-gray-500"
                } transition-colors`}
                onClick={() => handlePg(index + 1)}
              >
                {index + 1}
              </button>
            ))}
          <button
            className={`cursor-pointer px-3 py-1 rounded-lg ${
              currPage === totalPages
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-white/5 text-white hover:bg-white/10"
            } transition-colors`}
            onClick={() => handlePg("next")}
            disabled={currPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Orders;
