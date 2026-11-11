import { Banknote, CreditCard, Truck } from "lucide-react";
import Frame from "../ui/Frame";
import Reveal from "../ui/Reveal";
import TwoTone from "../ui/TwoTone";

const PILLARS = [
  { icon: CreditCard, title: "Stripe Checkout" },
  { icon: Banknote, title: "Cash on delivery" },
  { icon: Truck, title: "Tracked orders" },
];

const FACTS = [
  "Card details go straight to Stripe, never to us",
  "Your size is held while it's in your cart",
  "Accounts are verified by email",
  "Coupons are checked before you pay",
  "Flat $5 shipping on every order",
  "Follow each order from pending to delivered",
];

// How checkout works, as plain facts in a ruled list
const TrustSection = () => (
  <Frame as="section" className="grid gap-10 border-t border-line px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)]">
    <Reveal>
      <TwoTone top="Safe checkout," bottom="every order tracked." className="text-3xl sm:text-[2.1rem]" />
    </Reveal>

    <div>
      <Reveal className="grid grid-cols-3 border-y border-line sm:border-y-0">
        {PILLARS.map(({ icon: Icon, title }, index) => (
          <div key={title} className={`flex flex-col items-center gap-3 py-6 text-center ${index > 0 ? "border-l border-line" : ""}`}>
            <span className="flex size-14 items-center justify-center rounded-full border border-line-strong text-muted">
              <Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
            </span>
            <span className="text-xs text-muted">{title}</span>
          </div>
        ))}
      </Reveal>

      <Reveal delay={0.1} as="ul" className="mt-6 grid gap-x-8 sm:grid-cols-2">
        {FACTS.map((fact) => (
          <li key={fact} className="border-b border-line py-3.5 text-[13px] text-muted">
            {fact}
          </li>
        ))}
      </Reveal>
    </div>
  </Frame>
);

export default TrustSection;
