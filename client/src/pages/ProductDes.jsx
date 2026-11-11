import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { m } from "motion/react";
import { Check, ChevronRight, Minus, PackageX, Plus } from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";
import useAuth from "../Hooks/UseAuth";
import { addToCartAsync } from "../redux/Thunk/cartThunks";
import useOpenCategory from "../Hooks/useOpenCategory";
import { transferProductData } from "../redux/Slice/shopSlice";
import { categoryLabel, MAX_ITEM_QUANTITY, variantName } from "../utils/catalog";
import { formatMoney } from "../utils/money";
import { productImage } from "../utils/images";
import Frame from "../components/ui/Frame";
import Button, { ButtonLink } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";
import { cx } from "../components/ui/styles";

const ease = [0.22, 1, 0.36, 1];

const ProductDescription = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const openCategory = useOpenCategory();
  const fromCard = useSelector((state) => state.shop.productData);
  const [product, setProduct] = useState(fromCard?._id === id ? fromCard : null);
  const [status, setStatus] = useState(product ? "ready" : "loading");
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Opened from a link or a reload: fetch the product. From a card: refresh its stock quietly.
  useEffect(() => {
    let active = true;
    setSelected("");
    setAdded(false);
    api
      .getProduct(id)
      .then(({ data }) => {
        if (!active)
          return;
        setProduct(data.product);
        dispatch(transferProductData(data.product));
        setStatus("ready");
      })
      .catch((error) => active && setStatus((current) => (current === "ready" ? current : error.response?.status === 404 ? "missing" : "error")));
    return () => {
      active = false;
    };
  }, [id, dispatch]);

  if (status === "loading")
    return <PageSpinner />;
  if (status !== "ready" || !product)
    return (
      <Frame className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={PackageX}
          title={status === "missing" ? "This product isn't in the shop anymore." : "The product couldn't be loaded."}
          action={<ButtonLink to="/shop" variant="secondary">Back to the shop</ButtonLink>}
        />
      </Frame>
    );

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasOptions = !(variants.length === 1 && variants[0].label === "Default");
  const activeLabel = hasOptions ? selected : "Default";
  const activeVariant = variants.find((variant) => variant.label === activeLabel);
  const maxQuantity = Math.min(activeVariant?.stock || 0, MAX_ITEM_QUANTITY);
  const soldOut = variants.every((variant) => variant.stock <= 0);
  const typeLabel = product.genres?.join(" · ") || product.clothesType || product.shoeType || product.toyType?.replace("-", " ");

  const choose = (label) => {
    setSelected(label);
    setQuantity(1);
    setAdded(false);
  };

  const addToCart = async () => {
    if (!user) {
      toast.info("Log in to add items to your cart.");
      return navigate("/login", { state: { from: { pathname: `/shop/${id}` } } });
    }
    if (!activeVariant)
      return toast.error(`Choose a ${variantName(product.category).toLowerCase()} first.`);

    setAdding(true);
    try {
      const result = await dispatch(addToCartAsync({ product, variant: activeLabel, quantity })).unwrap();
      // Show the stock the server just reported, so the page stays truthful
      const updated = { ...product, variants: variants.map((v) => (v.label === activeLabel ? { ...v, stock: result.stock } : v)) };
      setProduct(updated);
      dispatch(transferProductData(updated));
      setQuantity(1);
      setAdded(true);
      toast.success(result.reservedQuantity < quantity ? `Only ${result.reservedQuantity} added. That was the last of it.` : "Added to your cart.");
    } catch (error) {
      toast.error(typeof error === "string" ? error : error?.message || "Couldn't add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Frame className="flex-1 px-6 pb-20 pt-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted">
        <Link to="/shop" className="hover:text-ink">Shop</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 text-subtle" />
        <button type="button" onClick={() => openCategory(product.category)} className="hover:text-ink">
          {categoryLabel(product.category)}
        </button>
        <ChevronRight aria-hidden="true" className="size-3.5 text-subtle" />
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <m.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease }}
          className="flex aspect-square items-center justify-center overflow-hidden rounded-panel border border-line bg-surface lg:sticky lg:top-20"
        >
          <img
            src={productImage(product.image, 900)}
            alt={product.name}
            fetchPriority="high"
            className={product.category === "comics" ? "h-full w-auto object-cover" : "size-full object-contain p-8"}
          />
        </m.div>

        <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }}>
          <p className="text-[13px] capitalize text-muted">
            {categoryLabel(product.category)}
            {typeLabel && <span className="text-subtle"> · {typeLabel}</span>}
          </p>
          <h1 className="mt-2 text-3xl font-medium leading-tight tracking-[-0.03em] text-ink text-balance sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-2xl tabular-nums text-ink">{formatMoney(product.price)}</p>
          {product.description && <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-muted">{product.description}</p>}

          {hasOptions && (
            <fieldset className="mt-8">
              <legend className="mb-2.5 text-[13px] font-medium text-ink">
                {variantName(product.category)}
                {activeVariant && <span className="font-normal text-muted"> · {activeVariant.stock} in stock</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {variants.map(({ label, stock }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={stock <= 0}
                    aria-pressed={selected === label}
                    onClick={() => choose(label)}
                    className={cx(
                      "h-10 min-w-12 rounded-full border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:text-subtle disabled:line-through",
                      selected === label ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-line-strong",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {!soldOut && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex h-11 items-center rounded-full border border-line bg-surface">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                  className="flex size-11 items-center justify-center rounded-full text-ink-soft hover:text-ink disabled:opacity-30"
                >
                  <Minus aria-hidden="true" className="size-4" />
                </button>
                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={!activeVariant || quantity >= maxQuantity}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex size-11 items-center justify-center rounded-full text-ink-soft hover:text-ink disabled:opacity-30"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </button>
              </div>
              <Button size="lg" onClick={addToCart} disabled={adding || (hasOptions && !activeVariant)} className="flex-1 sm:flex-none sm:min-w-48">
                {adding ? "Adding…" : hasOptions && !activeVariant ? `Choose a ${variantName(product.category).toLowerCase()}` : "Add to cart"}
              </Button>
              {added && (
                <ButtonLink to="/cart" variant="secondary" size="lg">
                  View cart
                </ButtonLink>
              )}
            </div>
          )}
          {soldOut && <p className="mt-8 rounded-lg bg-sunken px-4 py-3 text-sm text-muted">Sold out for now. Check back soon.</p>}

          <ul className="mt-10 border-t border-line text-[13px] text-muted">
            {["Held for you while it's in your cart", "Flat $5 shipping", "Pay by card or cash on delivery"].map((note) => (
              <li key={note} className="flex items-center gap-2.5 border-b border-line py-3">
                <Check aria-hidden="true" className="size-4 text-ink" />
                {note}
              </li>
            ))}
          </ul>
        </m.div>
      </div>
    </Frame>
  );
};

export default ProductDescription;
