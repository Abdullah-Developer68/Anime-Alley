import { Fragment, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  setReloadData,
  openProductDeleteModal,
  openProductForm,
  openExportModal,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import ProductForm from "./ProductForm";
import DeleteProduct from "./DeleteProduct";
import { formatMoney } from "../../../../utils/formatPrice";
import { Plus, Download } from "lucide-react";
import DashboardPagination from "../../DashboardPagination";
import DataTable, { RowActions, StatusDot, Stacked } from "../../DataTable";
import { PageHeader, ToolbarButton } from "../../DashboardUI";

// The API returns 24 products per page unless a limit is sent
const PRODUCTS_PER_PAGE = 24;

const isSingleStock = (variants) => variants.length === 1 && variants[0].label === "Default";

// Comics store bare volume numbers as labels, so they get a "Vol." prefix for readability
const variantName = (product, label) =>
  product.category === "comics" && !label.startsWith("V") ? `Vol. ${label}` : label;

const StockSummary = ({ product }) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) return <span className="text-ink-500">—</span>;

  if (isSingleStock(variants)) {
    const units = variants[0].stock;
    return units > 0 ? (
      <StatusDot tone="success">{units} in stock</StatusDot>
    ) : (
      <StatusDot tone="danger">Out of stock</StatusDot>
    );
  }

  const total = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const soldOut = variants.filter((v) => !(v.stock > 0)).length;
  return (
    <div className="min-w-0">
      <StatusDot tone={total === 0 ? "danger" : soldOut > 0 ? "warning" : "success"}>
        {total} units
        {soldOut > 0 && <span className="text-ink-400">· {soldOut} sold out</span>}
      </StatusDot>
      <p className="mt-1 truncate text-xs tabular-nums text-ink-400" title={variants.map((v) => `${variantName(product, v.label)}: ${v.stock}`).join(", ")}>
        {variants.map((v, i) => (
          <Fragment key={v.label}>
            {i > 0 && <span className="text-ink-600"> · </span>}
            <span className={v.stock > 0 ? "" : "text-ink-600 line-through"}>
              {variantName(product, v.label)} {v.stock}
            </span>
          </Fragment>
        ))}
      </p>
    </div>
  );
};

StockSummary.propTypes = { product: PropTypes.object.isRequired };

const PRODUCT_COLUMNS = [
  {
    key: "product",
    header: "Product",
    width: "w-[38%]",
    render: (product) => (
      <Stacked
        leading={<img src={product.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-white/5 object-cover ring-1 ring-white/10" />}
        title={product.name}
        subtitle={`#${product.productID}`}
      />
    ),
  },
  {
    key: "category",
    header: "Category",
    render: (product) => <span className="capitalize text-ink-200">{product.category}</span>,
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    render: (product) => <span className="font-medium tabular-nums">{formatMoney(product.price)}</span>,
  },
  {
    key: "stock",
    header: "Stock",
    width: "w-[30%]",
    wideOnCard: true,
    render: (product) => <StockSummary product={product} />,
  },
];

const ProductCatalog = () => {
  // states
  const [products, setProducts] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);

  // redux
  const {
    reloadData,
    productDeleteModalState,
    productFormState,
    productFilters,
  } = useSelector((state) => state.dashboard);

  const dispatch = useDispatch();

  // Load products based on Redux productFilters and current page
  const loadProducts = useCallback(async () => {
    setLoading(true);
    const activeFilters = productFilters || {};
    const payload = {
      category: (activeFilters.category || "comics").toLowerCase(),
      productTypes:
        activeFilters.productTypes && activeFilters.productTypes.length
          ? activeFilters.productTypes.map((type) => type.toLowerCase())
          : ["all"],
      price: Number(activeFilters.price) || 0,
      sortBy: activeFilters.sortBy || "popular",
      page: currPage,
      searchQuery: (activeFilters.searchQuery || "").trim(),
    };

    try {
      const response = await api.getProducts(payload);
      if (response.data.success) {
        setProducts(response.data.currPageProducts);
        setTotalPages(response.data.totalPages);
        setTotalProducts(response.data.totalProducts);
      }
    } catch (error) {
      console.error("Error loading products:", {
        message: error.message,
        response: error.response?.data,
        payload,
      });
    } finally {
      setLoading(false);
    }
  }, [productFilters, currPage]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrPage(1);
  }, [
    productFilters?.category,
    productFilters?.searchQuery,
    productFilters?.price,
    productFilters?.productTypes,
    productFilters?.filterVersion,
  ]);

  // Fetch products on mount and when loadProducts changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reloads products when productReload is triggered via Redux
  useEffect(() => {
    if (reloadData === "products") {
      loadProducts().then(() => {
        dispatch(setReloadData(null));
      });
    }
  }, [reloadData, dispatch, loadProducts]);

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

  const handleDeleteModal = (product) => {
    dispatch(openProductDeleteModal(product));
  };

  const openForm = (product) => {
    dispatch(openProductForm(product ? product : null));
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {productFormState.isOpen && <ProductForm />}
      {productDeleteModalState.isOpen && <DeleteProduct />}

      <PageHeader
        title="Products"
        subtitle={loading ? "Loading catalogue…" : `${totalProducts} in the current filter`}
      >
        <ToolbarButton icon={Download} label="Export" onClick={() => dispatch(openExportModal("products"))} />
        <ToolbarButton icon={Plus} label="Add product" variant="primary" onClick={() => openForm()} />
      </PageHeader>

      <DataTable
        label="Products"
        columns={PRODUCT_COLUMNS}
        rows={products}
        rowKey={(product) => product._id}
        loading={loading}
        emptyMessage="No products match these filters."
        actions={(product) => (
          <RowActions
            name={product.name}
            onEdit={() => openForm(product)}
            onDelete={() => handleDeleteModal(product)}
          />
        )}
      />

      <DashboardPagination
        currPage={currPage}
        totalPages={totalPages}
        totalItems={totalProducts}
        itemCount={products.length}
        pageSize={PRODUCTS_PER_PAGE}
        label="products"
        onPageChange={handlePg}
      />
    </div>
  );
};

export default ProductCatalog;
