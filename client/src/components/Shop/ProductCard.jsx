import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { m } from "motion/react";
import { transferProductData } from "../../redux/Slice/shopSlice";
import { formatMoney } from "../../utils/money";
import { productImage } from "../../utils/images";
import { categoryLabel, variantName } from "../../utils/catalog";
import { cx } from "../ui/styles";

const stockSummary = (product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const inStock = variants.filter((variant) => variant.stock > 0);
  if (inStock.length === 0)
    return null;
  if (variants.length === 1 && variants[0].label === "Default")
    return variants[0].stock <= 3 ? `Only ${variants[0].stock} left` : "In stock";
  const name = variantName(product.category).toLowerCase();
  return `${inStock.length} ${name}${inStock.length === 1 ? "" : "s"} in stock`;
};

// Product tile used by the shop grid and the home page
const ProductCard = ({ product, priority = false }) => {
  const dispatch = useDispatch();
  const stock = stockSummary(product);
  // Comic covers fill the frame; product shots on white sit inside it
  const isCover = product.category === "comics";

  return (
    <m.article whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className="group h-full">
      <Link
        to={`/shop/${product._id}`}
        onClick={() => dispatch(transferProductData(product))}
        className="flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface transition-shadow duration-300 group-hover:shadow-float"
      >
        <div className="relative aspect-[4/5] overflow-hidden border-b border-line bg-surface">
          <img
            src={productImage(product.image, 480)}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={cx(
              "size-full transition-transform duration-500 ease-out group-hover:scale-[1.04]",
              isCover ? "object-cover" : "object-contain p-5",
              !stock && "opacity-50 grayscale",
            )}
          />
          {!stock && (
            <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-line">
              Sold out
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">{product.name}</h3>
            <p className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatMoney(product.price)}</p>
          </div>
          <p className="mt-auto text-xs text-muted">
            {categoryLabel(product.category)}
            {stock && <span className="text-subtle"> · {stock}</span>}
          </p>
        </div>
      </Link>
    </m.article>
  );
};

export default ProductCard;
