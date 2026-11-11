import { cx } from "./styles";

const Spinner = ({ className, label = "Loading" }) => (
  <span role="status" aria-label={label} className={cx("inline-block size-5 animate-spin rounded-full border-2 border-line-strong border-t-ink", className)} />
);

// Full-area loading state used while a page or section fetches
export const PageSpinner = () => (
  <div className="flex min-h-[50vh] w-full items-center justify-center">
    <Spinner className="size-6" />
  </div>
);

export default Spinner;
