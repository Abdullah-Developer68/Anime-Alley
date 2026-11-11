import { useSelector } from "react-redux";
import { m } from "motion/react";
import assets from "../../assets/asset";
import { CATEGORIES } from "../../utils/catalog";
import TwoTone from "../ui/TwoTone";
import { selectAuthCopy } from "./authCopy";

const ease = [0.22, 1, 0.36, 1];

// Shared shell for the login and signup pages: the form, and a brand panel on large screens
const AuthLayout = ({ children }) => {
  const { title, subtitle, brandTitle, brandText } = useSelector(selectAuthCopy);

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
      <m.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="grid w-full max-w-5xl overflow-hidden rounded-panel border border-line bg-surface shadow-float lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]"
      >
        <section className="p-6 sm:p-10">
          <header className="mb-8">
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink sm:text-[1.7rem]">{title}</h1>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          </header>
          {children}
        </section>

        <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-line bg-canvas p-10 lg:flex">
          <div>
            <TwoTone top={brandTitle} bottom={brandText} className="text-[1.6rem] leading-tight" />
          </div>

          <div className="relative mt-10 h-64">
            <m.img
              src={assets.comicDragonBall}
              alt=""
              initial={{ opacity: 0, rotate: -12, y: 20 }}
              animate={{ opacity: 1, rotate: -8, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease }}
              className="absolute left-2 top-4 h-48 w-auto rounded-lg border border-line shadow-float"
            />
            <m.img
              src={assets.comicNaruto}
              alt=""
              initial={{ opacity: 0, rotate: 10, y: 20 }}
              animate={{ opacity: 1, rotate: 5, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease }}
              className="absolute left-28 top-0 h-52 w-auto rounded-lg border border-line shadow-float"
            />
            <m.img
              src={assets.sneakersAkatsuki}
              alt=""
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease }}
              className="absolute bottom-0 right-0 h-32 w-auto rounded-lg border border-line bg-surface p-2 shadow-float"
            />
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-x-6 border-t border-line">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <li key={id} className="flex items-center gap-2 border-b border-line py-3 text-[13px] text-muted">
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </li>
            ))}
          </ul>
        </aside>
      </m.div>
    </div>
  );
};

export default AuthLayout;
