import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setHistoryLoading } from "../redux/Slice/userHistorySlice";
import api from "../api/api";
import assets from "../assets/asset.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../components/Global/Loader";

const UserHistory = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state for data (not shared across components)
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Redux state only for loading (shared with Loader component)
  const isLoading = useSelector((state) => state.userHistory.isLoading);

  const getUserInfo = () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (!userInfo) return null;

      // Both local and Google login store user info in the same format
      // with id, email, and other user details
      return {
        id: userInfo.id,
        email: userInfo.email,
        // Include any other fields that your backend expects
      };
    } catch (error) {
      console.error("Error parsing userInfo:", error);
      return null;
    }
  };

  const fetchOrders = async () => {
    try {
      const loadingTimer = dispatch(setHistoryLoading(true));

      const userInfo = getUserInfo();

      if (!userInfo) {
        clearTimeout(loadingTimer);
        dispatch(setHistoryLoading(false));
        toast.error("Please login to view your order history");
        navigate("/login");
        return;
      }

      const res = await api.getOrderHistory(userInfo, currentPage);

      // Clear the loading timer since API call completed
      clearTimeout(loadingTimer);
      dispatch(setHistoryLoading(false));

      if (res.status === 200) {
        setPurchaseHistory(res.data.paginatedOrders);
        setTotalPages(res.data.totalPages);
      } else {
        console.error("Failed to fetch orders:", res.data.message);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      dispatch(setHistoryLoading(false));
      if (error.response?.status === 401) {
        toast.error("Please login to view your order history");
        navigate("/login");
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleNextPage = async () => {
    try {
      const userInfo = getUserInfo();
      if (!userInfo) {
        toast.error("Please login to view your order history");
        navigate("/login");
        return;
      }

      setCurrentPage((prev) => prev + 1);
      const res = await api.getOrderHistory(userInfo, currentPage + 1);
      if (res.status === 200) {
        setPurchaseHistory(res.data.paginatedOrders);
        setTotalPages(res.data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching next page:", error);
      if (error.response?.status === 401) {
        toast.error("Please login to view your order history");
        navigate("/login");
      }
    }
  };

  const handlePrevPage = async () => {
    try {
      const userInfo = getUserInfo();
      if (!userInfo) {
        toast.error("Please login to view your order history");
        navigate("/login");
        return;
      }

      setCurrentPage((prev) => prev - 1);
      const res = await api.getOrderHistory(userInfo, currentPage - 1);
      if (res.status === 200) {
        setPurchaseHistory(res.data.paginatedOrders);
        setTotalPages(res.data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching previous page:", error);
      if (error.response?.status === 401) {
        toast.error("Please login to view your order history");
        navigate("/login");
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only need to run this once on mount

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!purchaseHistory || purchaseHistory.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-md p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 blur-3xl -z-10"></div>
          <img
            src={assets.emptyCart}
            alt="No History"
            className="w-32 h-32 mx-auto mb-6 opacity-70"
          />
          <h2 className="text-2xl font-bold text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            No Purchase History
          </h2>
          <p className="text-white/60 text-center">
            Looks like you have not made any purchases yet. Start shopping to
            see your order history here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] py-6 mt-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Navigation */}
        <div className="bg-black/30 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Purchase History</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/60 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded text-sm ${
                  currentPage === 1
                    ? "bg-white/5 text-white/30"
                    : "bg-pink-500/10 text-white hover:bg-pink-500/20"
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1.5 rounded text-sm ${
                  currentPage >= totalPages
                    ? "bg-white/5 text-white/30"
                    : "bg-pink-500/10 text-white hover:bg-pink-500/20"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid gap-4">
          {purchaseHistory.map((order, index) => (
            <div
              key={index}
              className="bg-black/30 rounded-lg overflow-hidden border border-white/10"
            >
              {/* Order Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-black/20 text-sm">
                <div>
                  <span className="text-pink-400/70 text-xs block">
                    Order ID
                  </span>
                  <span className="text-white">{order.orderID}</span>
                </div>
                <div>
                  <span className="text-pink-400/70 text-xs block">Date</span>
                  <span className="text-white">
                    {formatDate(order.orderDate)}
                  </span>
                </div>
                <div>
                  <span className="text-pink-400/70 text-xs block">
                    Payment
                  </span>
                  <span className="text-white">{order.paymentMethod}</span>
                </div>
                <div className="text-right md:text-left">
                  <span className="text-pink-400/70 text-xs block">Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      order.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Products List - Scrollable */}
              <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                {order.products.map((product, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex items-center gap-3 hover:bg-white/5"
                  >
                    <img
                      src={product.productId.image}
                      alt={product.productId.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-grow min-w-0">
                      <h3 className="text-white truncate text-sm">
                        {product.productId.name}
                      </h3>
                      <p className="text-white/40 text-xs">
                        Qty: {product.quantity} × {product.price} $
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-pink-400 font-medium">
                        {product.price * product.quantity} $
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary - Compact */}
              <div className="bg-black/20 p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-pink-400/70 text-xs mb-1">
                    Shipping Address
                  </p>
                  <p className="text-white/70 text-xs leading-relaxed">
                    {order.shippingAddress}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-white/60 text-xs">
                    <span>Subtotal:</span>
                    <span>{order.subtotal}$</span>
                  </div>
                  <div className="flex justify-between text-white/60 text-xs">
                    <span>Shipping:</span>
                    <span>{order.shippingCost}$</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-400 text-xs">
                      <span>Discount:</span>
                      <span>-{order.discount}$</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white pt-2 border-t border-white/10">
                    <span className="font-medium">Total</span>
                    <span className="text-pink-400 font-bold">
                      {order.finalAmount}$
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserHistory;
