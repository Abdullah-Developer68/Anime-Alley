import { useRef } from "react";
import Banner from "../components/Home/Banner";
import ComicsSection from "../components/Home/ComicsSection";
import ClothesSection from "../components/Home/ClothesSection";
import ActionFigureSection from "../components/Home/ActionFigureSection";

const Home = () => {
  const bannerRef = useRef(null);
  const comicsRef = useRef(null);
  const clothesRef = useRef(null);
  const actionFiguresRef = useRef(null);

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
