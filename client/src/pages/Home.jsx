import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  markComponentLoaded,
  resetLoadingState,
} from "../redux/Slice/homeSlice";
import Banner from "../components/Home/Banner";
import ComicsSection from "../components/Home/ComicsSection";
import ClothesSection from "../components/Home/ClothesSection";
import ActionFigureSection from "../components/Home/ActionFigureSection";

const Home = () => {
  const dispatch = useDispatch();
  const { isLoading, loadingProgress, componentLoadStatus } = useSelector(
    (state) => state.home
  );

  const bannerRef = useRef(null);
  const comicsRef = useRef(null);
  const clothesRef = useRef(null);
  const actionFiguresRef = useRef(null);

  // Reset loading state when component mounts
  useEffect(() => {
    dispatch(resetLoadingState());

    // Simple sequential loading - mark components as loaded in order
    const loadingSequence = [
      { component: "banner", delay: 300 },
      { component: "comics", delay: 600 },
      { component: "clothes", delay: 900 },
      { component: "actionFigures", delay: 1200 },
    ];

    loadingSequence.forEach(({ component, delay }) => {
      setTimeout(() => {
        dispatch(markComponentLoaded(component));
      }, delay);
    });
  }, [dispatch]);

  // Fallback mechanism to ensure loading never gets stuck
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      // Force completion after 2 seconds if still loading
      if (isLoading) {
        const components = ["banner", "comics", "clothes", "actionFigures"];
        components.forEach((component) => {
          if (!componentLoadStatus[component]) {
            dispatch(markComponentLoaded(component));
          }
        });
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [isLoading, componentLoadStatus, dispatch]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center">
        <div className="w-80 max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Loading Anime Alley...
          </h2>

          <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>

          <div className="text-center text-gray-100 font-medium">
            {loadingProgress}%
          </div>

          <div className="text-center text-gray-400 text-sm mt-2">
            {loadingProgress < 25 && "Loading banner..."}
            {loadingProgress >= 25 &&
              loadingProgress < 50 &&
              "Loading comics section..."}
            {loadingProgress >= 50 &&
              loadingProgress < 75 &&
              "Loading clothes section..."}
            {loadingProgress >= 75 &&
              loadingProgress < 100 &&
              "Loading action figures..."}
            {loadingProgress === 100 && "Almost ready!"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={bannerRef}>
        <Banner />
      </div>

      <div className="w-screen h-1 bg-red-500" />

      <div className="sticky top-0 z-10" ref={comicsRef}>
        <ComicsSection />
      </div>

      <div className="sticky top-0 z-20" ref={clothesRef}>
        <ClothesSection />
      </div>

      <hr />

      <div className="sticky top-0 z-30" ref={actionFiguresRef}>
        <ActionFigureSection />
      </div>
    </>
  );
};

export default Home;
