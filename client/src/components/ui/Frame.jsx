import { cx } from "./styles";

// The page's framed column: content width with hairlines down both sides on larger screens.
// Sections stacked inside it draw their own top border, so the page reads as a ruled grid.
const Frame = ({ as: Tag = "div", className, children, ...props }) => (
  <Tag className={cx("mx-auto w-full max-w-frame md:border-x md:border-line", className)} {...props}>
    {children}
  </Tag>
);

export default Frame;
