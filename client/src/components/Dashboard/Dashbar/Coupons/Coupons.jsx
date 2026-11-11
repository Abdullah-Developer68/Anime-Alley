import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BadgePercent, Download, Pencil, Plus, Tag, Trash2, TrendingUp } from "lucide-react";
import api from "../../../../api/api";
import {
  openCouponCreateModal,
  openCouponDeleteModal,
  openCouponEditModal,
  openExportModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import { formatDate, formatMoney } from "../../../../utils/money";
import EditCoupon from "./EditCoupon";
import DeleteCoupon from "./DeleteCoupon";
import CreateCoupon from "./CreateCoupon";
import PageHeader from "../../shared/PageHeader";
import StatCard from "../../shared/StatCard";
import DemoNotice from "../../shared/DemoNotice";
import { READ_ONLY_TITLE, useReadOnly } from "../../shared/readOnly";
import { emptyCellClass, rowClass, tableClass, tableWrapClass, tdClass, thClass } from "../../shared/tableStyles";
import Badge from "../../../ui/Badge";
import Button from "../../../ui/Button";
import Pagination from "../../../ui/Pagination";
import { cx } from "../../../ui/styles";

const isActive = (coupon) => new Date(coupon.expiryDate) > new Date();

const Coupons = () => {
  const dispatch = useDispatch();
  const readOnly = useReadOnly();
  const reloadData = useSelector((state) => state.dashboard.reloadData);
  const [coupons, setCoupons] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ activeCoupons: 0, totalUsage: 0, totalDiscount: 0 });

  const loadCoupons = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.getAllCoupons(page);
      setCoupons(data.allCoupons);
      setTotalPages(data.totalPages);
      setTotalCoupons(data.totalCoupons);
    } catch (err) {
      setCoupons([]);
      setError(err.response?.data?.message || "Failed to fetch coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.getCouponStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch coupon stats:", err);
    }
  }, []);

  useEffect(() => {
    loadCoupons(currPage);
  }, [currPage, loadCoupons]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Creates, edits and deletes ask for a reload through Redux
  useEffect(() => {
    if (reloadData !== "coupons")
      return;
    loadCoupons(currPage);
    loadStats();
    dispatch(setReloadData(null));
  }, [reloadData, currPage, loadCoupons, loadStats, dispatch]);

  return (
    <div className="space-y-6">
      <CreateCoupon />
      <EditCoupon />
      <DeleteCoupon />

      <PageHeader title="Coupons" description={`${totalCoupons} codes`}>
        <Button variant="secondary" size="sm" onClick={() => dispatch(openExportModal("coupons"))} disabled={readOnly} title={readOnly ? READ_ONLY_TITLE : undefined}>
          <Download aria-hidden="true" className="size-3.5" />
          Export
        </Button>
        <Button size="sm" onClick={() => dispatch(openCouponCreateModal())} disabled={readOnly} title={readOnly ? READ_ONLY_TITLE : undefined}>
          <Plus aria-hidden="true" className="size-3.5" />
          New coupon
        </Button>
      </PageHeader>

      <DemoNotice />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active codes" value={stats.activeCoupons} icon={Tag} tone="success" index={0} />
        <StatCard label="Times used" value={stats.totalUsage} icon={TrendingUp} tone="info" index={1} />
        <StatCard label="Discount given" value={formatMoney(stats.totalDiscount)} icon={BadgePercent} tone="violet" index={2} />
      </div>

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Code</th>
              <th className={thClass}>Discount</th>
              <th className={thClass}>Expires</th>
              <th className={thClass}>Used</th>
              <th className={thClass}>Status</th>
              <th className={cx(thClass, "text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={emptyCellClass}>Loading coupons…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className={cx(emptyCellClass, "text-danger")}>{error}</td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className={emptyCellClass}>No coupons yet.</td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon._id} className={rowClass}>
                  <td className={cx(tdClass, "font-mono text-[12.5px] text-ink")}>{coupon.couponCode}</td>
                  <td className={cx(tdClass, "tabular-nums")}>{coupon.discountPercentage}%</td>
                  <td className={cx(tdClass, "whitespace-nowrap")}>{formatDate(coupon.expiryDate)}</td>
                  <td className={cx(tdClass, "tabular-nums")}>
                    {coupon.totalUsage || 0}
                    <span className="ml-1.5 text-xs text-subtle">({formatMoney(coupon.lifeTimeDiscount || 0)})</span>
                  </td>
                  <td className={tdClass}>
                    <Badge tone={isActive(coupon) ? "success" : "neutral"}>{isActive(coupon) ? "Active" : "Expired"}</Badge>
                  </td>
                  <td className={cx(tdClass, "text-right")}>
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${coupon.couponCode}`} title={readOnly ? READ_ONLY_TITLE : "Edit"} disabled={readOnly} onClick={() => dispatch(openCouponEditModal(coupon))}>
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${coupon.couponCode}`} title={readOnly ? READ_ONLY_TITLE : "Delete"} disabled={readOnly} onClick={() => dispatch(openCouponDeleteModal(coupon))}>
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
        <Pagination page={currPage} totalPages={totalPages} onPageChange={setCurrPage} label="Coupon pages" />
      </div>
    </div>
  );
};

export default Coupons;
