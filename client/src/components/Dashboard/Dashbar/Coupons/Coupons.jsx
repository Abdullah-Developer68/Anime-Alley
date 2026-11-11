import { useState, useEffect, useCallback } from "react";
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
import { Download, RefreshCw, Plus } from "lucide-react";
import DashboardPagination from "../../DashboardPagination";
import DataTable, { RowActions, StatusDot } from "../../DataTable";
import { PageHeader, StatCard, ToolbarButton } from "../../DashboardUI";
import { formatMoney } from "../../../../utils/formatPrice";
import { formatDate, formatRelativeDays } from "../../../../utils/formatDate";

const isActive = (coupon) => new Date(coupon.expiryDate) > new Date();

const COUPON_COLUMNS = [
  {
    key: "code",
    header: "Code",
    render: (coupon) => (
      <span className="font-semibold tracking-wide text-ink-50">{coupon.couponCode}</span>
    ),
  },
  {
    key: "discount",
    header: "Discount",
    align: "right",
    render: (coupon) => <span className="font-medium tabular-nums">{coupon.discountPercentage}%</span>,
  },
  {
    key: "usage",
    header: "Usage",
    align: "right",
    render: (coupon) => (
      <div>
        <p className="tabular-nums">{coupon.totalUsage || 0} uses</p>
        <p className="text-xs tabular-nums text-ink-400">{formatMoney(coupon.lifeTimeDiscount || 0)} saved</p>
      </div>
    ),
  },
  {
    key: "expiry",
    header: "Valid until",
    render: (coupon) => (
      <div>
        <p className="tabular-nums text-ink-200">{formatDate(coupon.expiryDate)}</p>
        <p className="text-xs text-ink-400">{formatRelativeDays(coupon.expiryDate)}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (coupon) =>
      isActive(coupon) ? <StatusDot tone="success">Active</StatusDot> : <StatusDot>Expired</StatusDot>,
  },
];

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

  const loadCoupons = useCallback(
    async (page = 1) => {
      if (!user?.email) return;
      setLoading(true);
      setError("");
      try {
        const res = await api.getAllCoupons(page);
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
    },
    [user?.email],
  );

  const refreshStats = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!user?.email) return;
    try {
      const res = await api.getCouponStats();
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
  }, [user?.email]);

  // Fetch stats only on mount and when refresh is clicked
  useEffect(() => {
    setLoading(true);
    refreshStats();
  }, [refreshStats]);

  // Load coupons on mount and when page changes
  useEffect(() => {
    loadCoupons(currPage);
  }, [loadCoupons, currPage]);

  // Reload data when reloadDataType changes (when user makes edit or delete actions)
  useEffect(() => {
    if (reloadDataType === "coupons") {
      loadCoupons(currPage);
      dispatch(setReloadData(null));
      refreshStats();
    }
  }, [reloadDataType, currPage, refreshStats, dispatch, loadCoupons]);

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
    <div className="space-y-5 p-4 sm:p-6">
      <EditCoupon />
      <DeleteCoupon />
      <CreateCoupon />

      <PageHeader title="Coupons" subtitle={`${totalCoupons} codes`}>
        <ToolbarButton icon={RefreshCw} label="Refresh" spin={loading} disabled={loading} onClick={handleRefreshStats} />
        <ToolbarButton icon={Download} label="Export" onClick={() => dispatch(openExportModal("coupons"))} />
        <ToolbarButton icon={Plus} label="New coupon" variant="primary" onClick={() => dispatch(openCouponCreateModal())} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Active coupons" value={stats.activeCoupons} icon={assets.activeCoupons} />
        <StatCard label="Total uses" value={stats.totalUsage} icon={assets.couponUsage} />
        <StatCard label="Total discount" value={formatMoney(stats.totalDiscount || 0)} icon={assets.couponDiscount} />
      </div>

      <DataTable
        label="Coupons"
        columns={COUPON_COLUMNS}
        rows={coupons}
        rowKey={(coupon) => coupon._id}
        loading={loading}
        error={error}
        emptyMessage="No coupons yet. Create one to get started."
        actions={(coupon) => (
          <RowActions
            name={`coupon ${coupon.couponCode}`}
            onEdit={() => dispatch(openCouponEditModal(coupon))}
            onDelete={() => handleDelete(coupon)}
          />
        )}
      />

      <DashboardPagination
        currPage={currPage}
        totalPages={totalPages}
        totalItems={totalCoupons}
        itemCount={coupons.length}
        pageSize={20}
        label="coupons"
        onPageChange={handlePg}
      />
    </div>
  );
};

export default Coupons;
