import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { m } from "motion/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { updateCartItemAsync } from "../../redux/Thunk/cartThunks";
import { transferProductData } from "../../redux/Slice/shopSlice";
import { MAX_ITEM_QUANTITY, variantName } from "../../utils/catalog";
import { formatMoney } from "../../utils/money";
import { productImage } from "../../utils/images";

const stepClass = "flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30";

// One cart row. Quantity changes go to the server first, because they move reserved stock.
const CartLine = ({ item }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const stock = item.variants?.find((variant) => variant.label === item.selectedVariant)?.stock ?? 0;
  const showVariant = item.selectedVariant && item.selectedVariant !== "Default";

  const setQuantity = async (newQuantity) => {
    setBusy(true);
    try {
      await dispatch(updateCartItemAsync({ id: item._id, variant: item.selectedVariant, newQuantity })).unwrap();
      if (newQuantity === 0)
        toast.success(`${item.name} removed from your cart.`);
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Couldn't update your cart.");
      setBusy(false);
    }
    if (newQuantity !== 0)
      setBusy(false);
  };

  return (
    <m.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
      className="flex gap-4 border-b border-line py-5 last:border-b-0"
    >
      <Link
        to={`/shop/${item._id}`}
        onClick={() => dispatch(transferProductData(item))}
        className="size-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface sm:size-28"
      >
        <img
          src={productImage(item.image, 240)}
          alt={item.name}
          loading="lazy"
          className={item.category === "comics" ? "size-full object-cover" : "size-full object-contain p-2"}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to={`/shop/${item._id}`} onClick={() => dispatch(transferProductData(item))} className="line-clamp-2 text-[15px] font-medium text-ink hover:underline">
              {item.name}
            </Link>
            <p className="mt-0.5 text-[13px] text-muted">
              {showVariant && `${variantName(item.category)} ${item.selectedVariant} · `}
              {formatMoney(item.price)} each
            </p>
          </div>
          <p className="shrink-0 text-[15px] font-medium tabular-nums text-ink">{formatMoney(item.price * item.itemQuantity)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-line bg-surface p-0.5" aria-busy={busy}>
            <button type="button" aria-label="Decrease quantity" className={stepClass} disabled={busy || item.itemQuantity <= 1} onClick={() => setQuantity(item.itemQuantity - 1)}>
              <Minus aria-hidden="true" className="size-3.5" />
            </button>
            <span className="w-7 text-center text-sm tabular-nums">{item.itemQuantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              className={stepClass}
              disabled={busy || item.itemQuantity >= MAX_ITEM_QUANTITY || stock <= 0}
              onClick={() => setQuantity(item.itemQuantity + 1)}
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setQuantity(0)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Remove
          </button>
        </div>
      </div>
    </m.li>
  );
};

export default CartLine;
