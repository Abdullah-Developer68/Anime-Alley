import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { m } from "motion/react";
import { Banknote, CreditCard, PackageOpen } from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";
import { cachePurchaseHistory, setHistoryLoading, setTotalPages } from "../redux/Slice/userHistorySlice";
import { variantName } from "../utils/catalog";
import { formatDate, formatMoney } from "../utils/money";
import { productImage } from "../utils/images";
import Frame from "../components/ui/Frame";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";
import { ButtonLink } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { ORDER_STATUS_TONES, panelClass } from "../components/ui/styles";

const STEPS = ["pending", "processing", "shipped", "delivered"];

// Orders store their own name/image/variant; older orders fall back to the linked product
const lineDetails = (line) => ({
  name: line.name || line.productId?.name || "Product no longer available",
  image: line.image || line.productId?.image,
});

const OrderCard = ({ order, index }) => {
  const reached = STEPS.indexOf(order.status);
  const PaymentIcon = order.paymentMethod === "stripe" ? CreditCard : Banknote;

  return (
    <m.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`${panelClass} overflow-hidden`}
    >
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-canvas/60 px-5 py-3.5 text-[13px]">
        <div>
          <p className="text-subtle">Order</p>
          <p className="font-medium text-ink">{order.orderID}</p>
        </div>
        <div>
          <p className="text-subtle">Placed</p>
          <p className="text-ink">{formatDate(order.createdAt || order.orderDate)}</p>
        </div>
        <div>
          <p className="text-subtle">Total</p>
          <p className="tabular-nums text-ink">{formatMoney(order.finalAmount)}</p>
        </div>
        <div className="ml-auto">
          <Badge tone={ORDER_STATUS_TONES[order.status]}>{order.status}</Badge>
        </div>
      </header>

      <div className="px-5 pt-4">
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {STEPS.map((step, i) => (
            <span key={step} className={`h-1 rounded-full ${i <= reached ? "bg-ink" : "bg-sunken"}`} />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-4 text-[11px] capitalize text-subtle">
          {STEPS.map((step, i) => (
            <span key={step} className={i <= reached ? "text-ink-soft" : ""}>{step}</span>
          ))}
        </div>
      </div>

      <ul className="px-5">
        {order.products.map((line, i) => {
          const { name, image } = lineDetails(line);
          return (
            <li key={i} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                {image && <img src={productImage(image, 120)} alt="" loading="lazy" className="size-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{name}</p>
                <p className="text-xs text-muted">
                  {line.variant && line.variant !== "Default" && `${variantName(line.productId?.category)} ${line.variant} · `}
                  Qty {line.quantity} × {formatMoney(line.price)}
                </p>
              </div>
              <p className="text-sm tabular-nums text-ink">{formatMoney(line.price * line.quantity)}</p>
            </li>
          );
        })}
      </ul>

      <footer className="grid gap-4 border-t border-line px-5 py-4 text-[13px] sm:grid-cols-2">
        <div className="space-y-1 text-muted">
          <p className="flex items-center gap-1.5 text-ink-soft">
            <PaymentIcon aria-hidden="true" className="size-3.5" />
            {order.paymentMethod === "stripe" ? "Paid by card" : "Cash on delivery"}
          </p>
          <p className="line-clamp-2">{order.shippingAddress}</p>
        </div>
        <dl className="space-y-1 sm:text-right">
          <div className="flex justify-between gap-6 text-muted sm:justify-end">
            <dt>Subtotal</dt>
            <dd className="tabular-nums text-ink-soft">{formatMoney(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-6 text-muted sm:justify-end">
            <dt>Shipping</dt>
            <dd className="tabular-nums text-ink-soft">{formatMoney(order.shippingCost)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-6 text-success sm:justify-end">
              <dt>{order.couponCode || "Discount"}</dt>
              <dd className="tabular-nums">−{formatMoney(order.discount)}</dd>
            </div>
          )}
        </dl>
      </footer>
    </m.article>
  );
};

const UserHistory = () => {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const { isLoading, purchaseHistory, totalPages, getNewHistoryCounter } = useSelector((state) => state.userHistory);

  // Cached orders show at once; the fresh list replaces them when it arrives
  useEffect(() => {
    let active = true;
    if (purchaseHistory.length === 0)
      dispatch(setHistoryLoading(true));
    api
      .getOrderHistory(page)
      .then(({ data }) => {
        if (!active)
          return;
        dispatch(cachePurchaseHistory(data.paginatedOrders));
        dispatch(setTotalPages(data.totalPages));
      })
      .catch((error) => active && toast.error(error.response?.data?.message || "Couldn't load your orders."))
      .finally(() => active && dispatch(setHistoryLoading(false)));
    return () => {
      active = false;
    };
    // purchaseHistory is read only to decide whether to show the spinner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, getNewHistoryCounter, dispatch]);

  if (isLoading)
    return <PageSpinner />;

  if (purchaseHistory.length === 0)
    return (
      <Frame className="flex flex-1 items-center justify-center">
        <EmptyState icon={PackageOpen} title="No orders yet" action={<ButtonLink to="/shop">Start shopping</ButtonLink>}>
          When you place an order, you can follow it here from pending to delivered.
        </EmptyState>
      </Frame>
    );

  return (
    <Frame className="flex-1 px-4 pb-20 pt-8 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Account</p>
      <h1 className="mt-1.5 text-3xl font-medium tracking-[-0.03em] text-ink">Order history</h1>

      <div className="mt-8 grid gap-4">
        {purchaseHistory.map((order, index) => (
          <OrderCard key={order._id} order={order} index={index} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => {
          setPage(next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        label="Order pages"
        className="mt-10 justify-center"
      />
    </Frame>
  );
};

export default UserHistory;
