import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { m } from "motion/react";
import { Check } from "lucide-react";
import api from "../api/api";
import { emptyCartLocal } from "../redux/Slice/cartSlice";
import { getNewHistoryCounter } from "../redux/Slice/userHistorySlice";
import { ButtonLink } from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

// Stripe sends the shopper here after paying. The order is created by Stripe's webhook, so this page
// waits for it to appear, then opens the order history.
const Success = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [timedOut, setTimedOut] = useState(!sessionId);

  useEffect(() => {
    if (!sessionId)
      return;
    let attempts = 0;
    let timer;
    let active = true;

    const check = async () => {
      attempts++;
      try {
        const { data } = await api.verifyOrder(sessionId);
        if (!active)
          return;
        if (data.success) {
          dispatch(emptyCartLocal());
          dispatch(getNewHistoryCounter());
          return navigate("/history", { replace: true });
        }
      } catch (error) {
        console.error("Error verifying order:", error);
      }
      if (!active)
        return;
      if (attempts >= MAX_ATTEMPTS)
        return setTimedOut(true);
      timer = setTimeout(check, POLL_MS);
    };

    check();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sessionId, dispatch, navigate]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 text-center shadow-float sm:p-10">
        <m.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-white"
        >
          <Check aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </m.span>
        <h1 className="mt-6 text-2xl font-medium tracking-[-0.02em] text-ink">Payment received</h1>
        {timedOut ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Thanks for your order. It&apos;s still being confirmed and will appear in your order history shortly.
            </p>
            <div className="mt-7 flex justify-center gap-2">
              <ButtonLink to="/history">Order history</ButtonLink>
              <ButtonLink to="/shop" variant="secondary">
                Keep shopping
              </ButtonLink>
            </div>
          </>
        ) : (
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted">
            <Spinner className="size-4" />
            Confirming your order…
          </p>
        )}
      </div>
    </div>
  );
};

export default Success;
