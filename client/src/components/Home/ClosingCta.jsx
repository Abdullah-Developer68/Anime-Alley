import useAuth from "../../Hooks/UseAuth";
import { ButtonLink } from "../ui/Button";
import Reveal from "../ui/Reveal";
import TwoTone from "../ui/TwoTone";

const ClosingCta = () => {
  const { user } = useAuth();

  return (
    <section className="border-t border-line px-6 py-24 text-center sm:py-32">
      <Reveal>
        <TwoTone as="h2" mutedFirst top="Stop scrolling." bottom="Start collecting." className="text-4xl leading-[1.05] sm:text-6xl" />
      </Reveal>
      <Reveal delay={0.12} className="mt-9 flex justify-center gap-2">
        <ButtonLink to={user ? "/shop" : "/signup"}>{user ? "Browse the shop" : "Get started"}</ButtonLink>
        <ButtonLink to={user ? "/history" : "/shop"} variant="secondary">
          {user ? "Your orders" : "Browse the shop"}
        </ButtonLink>
      </Reveal>
    </section>
  );
};

export default ClosingCta;
