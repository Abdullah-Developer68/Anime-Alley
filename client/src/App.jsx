import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { m } from "motion/react";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import AnnouncementBar from "./components/Global/AnnouncementBar";
import Navbar from "./components/Global/Navbar";
import Footer from "./components/Global/Footer";
import { PageSpinner } from "./components/ui/Spinner";

// Every page but the landing page is its own chunk, so the first visit downloads only what it shows.
// "/dashboard/*" lets the dashboard define its own nested routes.
const Shop = lazy(() => import("./pages/Shop"));
const ProductDes = lazy(() => import("./pages/ProductDes"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const Cart = lazy(() => import("./pages/Cart"));
const UserHistory = lazy(() => import("./pages/UserHistory"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Success = lazy(() => import("./pages/Success"));
const GoogleAuthSuccess = lazy(() => import("./components/GoogleAuthSuccess"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  const { pathname } = useLocation();
  // "/dashboard/orders" -> "dashboard": tabs inside one section don't remount the whole page
  const section = pathname.split("/")[1] || "home";
  const isDashboard = section === "dashboard";

  // A new page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      {!isDashboard && <AnnouncementBar />}
      <Navbar />
      <main className="flex flex-1 flex-col">
        <ErrorBoundary key={section}>
          <Suspense fallback={<PageSpinner />}>
            <m.div
              key={section}
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:id" element={<ProductDes />} />
                <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><UserHistory /></ProtectedRoute>} />
                <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/success" element={<Success />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </m.div>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
}

export default App;
