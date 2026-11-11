import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { openExportModal, openProductDeleteModal, openProductForm, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import { categoryLabel } from "../../../../utils/catalog";
import { formatMoney } from "../../../../utils/money";
import { productImage } from "../../../../utils/images";
import ProductForm from "./ProductForm";
import DeleteProduct from "./DeleteProduct";
import PageHeader from "../../shared/PageHeader";
import DemoNotice from "../../shared/DemoNotice";
import { READ_ONLY_TITLE, useReadOnly } from "../../shared/readOnly";
import { emptyCellClass, rowClass, tableClass, tableWrapClass, tdClass, thClass } from "../../shared/tableStyles";
import Button from "../../../ui/Button";
import Pagination from "../../../ui/Pagination";
import { cx } from "../../../ui/styles";

// The API returns 24 products per page unless a limit is sent
const PRODUCTS_PER_PAGE = 24;

const StockCell = ({ product }) => {
  const variants = product.variants || [];
  if (variants.length === 1 && variants[0].label === "Default")
    return (
      <span className={variants[0].stock > 0 ? "text-ink-soft" : "text-danger"}>
        {variants[0].stock > 0 ? `${variants[0].stock} in stock` : "Out of stock"}
      </span>
    );
  return (
    <div className="flex max-w-xs flex-wrap gap-1">
      {variants.map((variant) => (
        <span
          key={variant.label}
          className={cx(
            "rounded-md px-1.5 py-0.5 text-[11.5px] tabular-nums",
            variant.stock > 0 ? "bg-sunken text-ink-soft" : "bg-danger-soft text-danger",
          )}
        >
          {variant.label} · {variant.stock}
        </span>
      ))}
    </div>
  );
};

const ProductCatalog = () => {
  const dispatch = useDispatch();
  const readOnly = useReadOnly();
  const { reloadData, productFormState, productFilters } = useSelector((state) => state.dashboard);
  const [products, setProducts] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getAdminProducts({
        category: productFilters.category || "comics",
        productTypes: productFilters.productTypes?.length ? productFilters.productTypes : ["all"],
        price: Number(productFilters.price) || 0,
        sortBy: productFilters.sortBy || "popular",
        page: currPage,
        searchQuery: (productFilters.searchQuery || "").trim(),
      });
      setProducts(data.currPageProducts);
      setTotalPages(data.totalPages);
      setTotalProducts(data.totalProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [productFilters, currPage]);

  // New filters start from the first page
  useEffect(() => {
    setCurrPage(1);
  }, [productFilters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Saves and deletes ask for a reload through Redux
  useEffect(() => {
    if (reloadData === "products")
      loadProducts().then(() => dispatch(setReloadData(null)));
  }, [reloadData, dispatch, loadProducts]);

  return (
    <div className="space-y-6">
      {productFormState.isOpen && <ProductForm />}
      <DeleteProduct />

      <PageHeader title="Products" description={`${totalProducts} in ${categoryLabel(productFilters.category || "comics").toLowerCase()}`}>
        <Button variant="secondary" size="sm" onClick={() => dispatch(openExportModal("products"))}>
          <Download aria-hidden="true" className="size-3.5" />
          Export
        </Button>
        <Button size="sm" onClick={() => dispatch(openProductForm(null))} disabled={readOnly} title={readOnly ? READ_ONLY_TITLE : undefined}>
          <Plus aria-hidden="true" className="size-3.5" />
          Add product
        </Button>
      </PageHeader>

      <DemoNotice />

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Product</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Stock</th>
              <th className={cx(thClass, "text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={emptyCellClass}>Loading products…</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className={emptyCellClass}>No products match these filters.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id} className={rowClass}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-3">
                      <img src={productImage(product.image, 96)} alt="" loading="lazy" className="size-10 shrink-0 rounded-md border border-line object-cover" />
                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate font-medium text-ink">{product.name}</p>
                        <p className="text-xs text-subtle">#{product.productID}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>{categoryLabel(product.category)}</td>
                  <td className={cx(tdClass, "tabular-nums text-ink")}>{formatMoney(product.price)}</td>
                  <td className={tdClass}>
                    <StockCell product={product} />
                  </td>
                  <td className={cx(tdClass, "text-right")}>
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${product.name}`} title={readOnly ? READ_ONLY_TITLE : "Edit"} disabled={readOnly} onClick={() => dispatch(openProductForm(product))}>
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${product.name}`} title={readOnly ? READ_ONLY_TITLE : "Delete"} disabled={readOnly} onClick={() => dispatch(openProductDeleteModal(product))}>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {products.length > 0 && `Showing ${(currPage - 1) * PRODUCTS_PER_PAGE + 1}–${(currPage - 1) * PRODUCTS_PER_PAGE + products.length} of ${totalProducts}`}
        </p>
        <Pagination page={currPage} totalPages={totalPages} onPageChange={setCurrPage} label="Product pages" />
      </div>
    </div>
  );
};

export default ProductCatalog;
