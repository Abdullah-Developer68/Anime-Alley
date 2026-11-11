import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { LazyMotion, MotionConfig } from "motion/react";
import { ToastContainer } from "react-toastify";
import "@fontsource-variable/geist";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import { AuthProvider } from "./context/AuthProvider";
import store from "./redux/store";
import App from "./App";

// Animation features download after first paint; until then `m` components render without motion.
// MotionConfig makes every animation respect the visitor's "reduce motion" setting.
const loadMotionFeatures = () => import("./utils/motionFeatures").then((module) => module.default);

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Provider store={store}>
          <LazyMotion features={loadMotionFeatures} strict>
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </LazyMotion>
          <ToastContainer position="bottom-right" autoClose={2500} hideProgressBar newestOnTop theme="light" />
        </Provider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
