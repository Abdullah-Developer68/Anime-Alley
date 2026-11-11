import { cx } from "./styles";

// Two-line heading: one line in ink, one muted. `mutedFirst` flips which line is muted.
const TwoTone = ({ as: Tag = "h2", top, bottom, mutedFirst = false, className }) => (
  <Tag className={cx("font-medium tracking-[-0.03em] text-balance", className)}>
    <span className={cx("block", mutedFirst && "text-subtle")}>{top}</span>
    <span className={cx("block", !mutedFirst && "text-subtle")}>{bottom}</span>
  </Tag>
);

export default TwoTone;
