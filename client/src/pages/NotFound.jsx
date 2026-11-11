import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import TwoTone from "../components/ui/TwoTone";

const NotFound = () => (
  <section className="mx-auto flex min-h-[65vh] w-full max-w-frame flex-col items-center justify-center px-6 text-center md:border-x md:border-line">
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Error 404</p>
    <TwoTone as="h1" top="This page wandered off." bottom="Let's get you back to the shop." className="mt-3 text-3xl sm:text-4xl" />
    <div className="mt-8 flex gap-2">
      <ButtonLink to="/shop">Browse the shop</ButtonLink>
      <ButtonLink to="/" variant="secondary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </ButtonLink>
    </div>
  </section>
);

export default NotFound;
