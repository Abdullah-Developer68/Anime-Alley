import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "react-toastify";
import { clearCartAsync, loadCartFromServer } from "../redux/Thunk/cartThunks";
import CartLine from "../components/Cart/CartLine";
import OrderSummary from "../components/Cart/OrderSummary";
import Frame from "../components/ui/Frame";
import Button, { ButtonLink } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { PageSpinner } from "../components/ui/Spinner";

const Cart = () => {
  const dispatch = useDispatch();
  const { cartItems, isCartLoaded, isLoading } = useSelector((state) => state.cart);
  const [clearing, setClearing] = useState(false);
  const itemCount = cartItems.reduce((sum, item) => sum + item.itemQuantity, 0);

  useEffect(() => {
    if (!isCartLoaded)
      dispatch(loadCartFromServer());
  }, [isCartLoaded, dispatch]);

  const clearCart = async () => {
    setClearing(true);
    try {
      await dispatch(clearCartAsync()).unwrap();
      toast.success("Cart cleared. The items are back in stock for others.");
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Couldn't clear the cart.");
    } finally {
      setClearing(false);
    }
  };

  if (!isCartLoaded && isLoading)
    return <PageSpinner />;

  if (cartItems.length === 0)
    return (
      <Frame className="flex flex-1 items-center justify-center">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<ButtonLink to="/shop">Start shopping</ButtonLink>}>
          Items you add are held for you while they&apos;re in your cart.
        </EmptyState>
      </Frame>
    );

  return (
    <Frame className="flex-1 px-4 pb-20 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Continue shopping
          </Link>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-ink">
            Your cart
            <span className="ml-2.5 text-lg tracking-normal text-subtle tabular-nums">{itemCount}</span>
          </h1>
        </div>
        <Button variant="danger-ghost" size="sm" onClick={clearCart} disabled={clearing}>
          {clearing ? "Clearing…" : "Clear cart"}
        </Button>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ul className="rounded-panel border border-line bg-surface px-4 sm:px-5">
          <AnimatePresence initial={false}>
            {cartItems.map((item) => (
              <CartLine key={`${item._id}-${item.selectedVariant}`} item={item} />
            ))}
          </AnimatePresence>
        </ul>
        <div className="lg:sticky lg:top-20">
          <OrderSummary />
        </div>
      </div>
    </Frame>
  );
};

export default Cart;
