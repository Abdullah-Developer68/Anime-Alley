import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeProductDeleteModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { categoryLabel } from "../../../../utils/catalog";
import { formatMoney } from "../../../../utils/money";
import { productImage } from "../../../../utils/images";
import ConfirmDialog from "../../shared/ConfirmDialog";

const DeleteProduct = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedProduct } = useSelector((state) => state.dashboard.productDeleteModalState);

  const remove = async () => {
    await api.deleteProduct(selectedProduct._id);
    toast.success(`${selectedProduct.name} deleted.`);
    dispatch(setReloadData("products"));
  };

  return (
    <ConfirmDialog
      open={isOpen && Boolean(selectedProduct)}
      onClose={() => dispatch(closeProductDeleteModal())}
      title="Delete product"
      description="It disappears from the shop and from every cart holding it."
      confirmWord={selectedProduct?.productID || ""}
      confirmLabel="Delete product"
      onConfirm={remove}
    >
      {selectedProduct && (
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <img src={productImage(selectedProduct.image, 96)} alt="" className="size-12 rounded-md border border-line object-cover" />
          <div className="min-w-0 text-[13px]">
            <p className="truncate font-medium text-ink">{selectedProduct.name}</p>
            <p className="text-muted">
              #{selectedProduct.productID} · {categoryLabel(selectedProduct.category)} · {formatMoney(selectedProduct.price)}
            </p>
          </div>
        </div>
      )}
    </ConfirmDialog>
  );
};

export default DeleteProduct;
