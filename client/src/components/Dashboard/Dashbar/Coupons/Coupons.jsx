import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import assets from "../../../../assets/asset";
import {
  openExportModal,
  setReloadData,
  openCouponEditModal,
  openCouponDeleteModal,
  openCouponCreateModal,
} from "../../../../redux/Slice/DashboardSlice";
import EditCoupon from "./EditCoupon";
import DeleteCoupon from "./DeleteCoupon";
import CreateCoupon from "./CreateCoupon";

const Coupons = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [coupons, setCoupons] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reloadDataType = useSelector((state) => state.dashboard.reloadData);
  const [stats, setStats] = useState({
    activeCoupons: 0,
    totalUsage: 0,
    totalDiscount: 0,
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getStatus = (expiryDate) => {
    return new Date(expiryDate) > new Date() ? "Active" : "Expired";
  };

  const loadCoupons = async (page = 1) => {
    if (!user?.email) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.getAllCoupons(user.email, page);
      if (res.data.success) {
        setCoupons(res.data.allCoupons);
        setTotalPages(res.data.totalPages);
        setTotalCoupons(res.data.totalCoupons);
      } else {
        setError(res.data.message || "Failed to fetch coupons.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setLoading(true);
    setError("");
    if (!user?.email) return;
    try {
      const res = await api.getCouponStats(user.email);
      if (res.data.success) {
        setStats(res.data);
      } else {
        setStats({ activeCoupons: 0, totalUsage: 0, totalDiscount: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch coupon stats:", error);
    } finally {
      setLoading(false);
    }
  };
  // Fetch stats only on mount and when refresh is clicked
  useEffect(() => {
    setLoading(true);
    refreshStats();
  }, [user?.email]);

  // Load coupons on mount and when page changes
  useEffect(() => {
    loadCoupons(currPage);
  }, [currPage, user?.email]);

  // Reload data when reloadDataType changes (when user makes edit or delete actions)
  useEffect(() => {
    if (reloadDataType === "coupons") {
      loadCoupons(currPage);
      dispatch(setReloadData(null));
      refreshStats();
    }
  }, [reloadDataType]);

  // Handler for refresh button
  const handleRefreshStats = () => {
    refreshStats();
  };

  const handlePg = (value) => {
    let newPage;
    if (value === "next" && currPage < totalPages) newPage = currPage + 1;
    else if (value === "prev" && currPage > 1) newPage = currPage - 1;
    else if (typeof value === "number") newPage = value;
    else return;
    setCurrPage(newPage);
  };

  const handleDelete = (couponToDelete) => {
    dispatch(openCouponDeleteModal(couponToDelete));
  };

  return (
    <div className="p-6 space-y-6">
      <EditCoupon />
      <DeleteCoupon />
      <CreateCoupon />
      {/* Header Section */}
      <div className="flex max-[565px]:flex-col flex-row justify-between max-[565px]:justify-center max-[565px]:items-end gap-4">
        <h1 className="text-2xl font-bold text-white ml-20">Coupons</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshStats}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors flex items-center gap-2"
            disabled={loading}
          >
            {loading ? <img src={assets.loader} alt="loading" /> : null}
            Refresh Stats
          </button>
          <button
            onClick={() => dispatch(openExportModal("coupons"))}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-black cursor-pointer rounded-lg transition-colors"
          >
            Export
          </button>
          <button
            className="bg-pink-500 hover:bg-pink-600 text-black px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => dispatch(openCouponCreateModal())}
          >
            <img src={assets.plus} alt="add" className="w-5 h-5 invert" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Coupons</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {stats.activeCoupons}
              </h3>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <img src={assets.activeCoupons} alt="Active Coupons" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Usage</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {stats.totalUsage}
              </h3>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <img src={assets.couponUsage} alt="Coupon Usage" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Discount</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ${stats.totalDiscount.toLocaleString()}
              </h3>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <img src={assets.couponDiscount} alt="Coupon Discount" />
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="relative overflow-x-auto max-h-[600px]">
          <table className="w-full min-w-[800px]">
            <thead className="bg-black/50 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Actions
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Discount
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Valid Until
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-red-400">
                    {error}
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    No coupons found.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr
                    key={coupon._id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex justify-start gap-2">
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit"
                          onClick={() => dispatch(openCouponEditModal(coupon))}
                        >
                          <img
                            src={assets.edit}
                            className="w-5 h-5"
                            alt="Edit"
                          />
                        </button>
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Delete"
                          onClick={() => handleDelete(coupon)}
                        >
                          <img
                            src={assets.deleteIcon}
                            className="w-5 h-5"
                            alt="Delete"
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {coupon.couponCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {coupon.discountPercentage}%
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {formatDate(coupon.expiryDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getStatus(coupon.expiryDate) === "Active"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {getStatus(coupon.expiryDate)}
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
          {coupons.length > 0
            ? `Showing ${(currPage - 1) * 20 + 1} to ${
                (currPage - 1) * 20 + coupons.length
              } of ${totalCoupons} coupons`
            : "No coupons found"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePg("prev")}
            disabled={currPage === 1}
            className="cursor-pointer px-3 py-1 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePg(index + 1)}
              className={`px-3 py-1 rounded-lg ${
                currPage === index + 1
                  ? "text-black bg-pink-500"
                  : "text-white bg-white/5 hover:bg-white/10"
              } transition-colors`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => handlePg("next")}
            disabled={currPage === totalPages}
            className="cursor-pointer px-3 py-1 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Coupons;
