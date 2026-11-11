import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import assets from "../../assets/asset";
import { selectAuthCopy } from "./authCopy";

const CATEGORIES = [
  { label: "Comics", image: assets.comics },
  { label: "Figures", image: assets.actionfigure },
  { label: "Apparel", image: assets.clothes },
  { label: "Sneakers", image: assets.shoes },
];

// Shared shell for the login and signup pages: brand panel on large screens, form panel always
// eslint-disable-next-line react/prop-types
const AuthLayout = ({ children }) => {
  const { title, subtitle, brandTitle, brandText } = useSelector(selectAuthCopy);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-12 pt-24 md:pt-28">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-2xl shadow-black/40 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-ink-900 p-10 lg:flex">

          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={assets.logo} alt="" className="h-10 w-10 rounded-full" />
              <span className="text-lg font-semibold tracking-tight text-white">Anime Alley</span>
            </Link>
            <h2 className="mt-14 text-3xl font-bold leading-tight text-white">{brandTitle}</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">{brandText}</p>
          </div>

          <ul className="relative mt-12 grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ label, image }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm"
              >
                <img src={image} alt="" className="h-9 w-9 object-contain" />
                <span className="text-sm font-medium text-slate-200">{label}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="p-6 sm:p-10">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          </header>
          {children}
        </section>
      </div>
    </div>
  );
};

export default AuthLayout;
