import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./Home.css";

import img1 from "../assets/plataforma1.jpg";
import img2 from "../assets/plataforma2.jpg";
import img3 from "../assets/plataforma3.jpg";
import img4 from "../assets/plataforma4.jpg";
import img5 from "../assets/plataforma5.jpg";

function Home() {
  const { t } = useTranslation();

  const products = [
    {
      title: "Netflix",
      image: img1,
      description: t("home.products.netflix"),
    },
    {
      title: "Disney+",
      image: img2,
      description: t("home.products.disney"),
    },
    {
      title: "Prime Video",
      image: img3,
      description: t("home.products.prime"),
    },
    {
      title: "HBO Max",
      image: img4,
      description: t("home.products.hbo"),
    },
    {
      title: "ChatGPT",
      image: img5,
      description: t("home.products.chatgpt"),
    },
  ];

  const [visibleSlides, setVisibleSlides] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setVisibleSlides(1);
      } else if (window.innerWidth <= 1024) {
        setVisibleSlides(2);
      } else {
        setVisibleSlides(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(visibleSlides);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const extendedProducts = [
    ...products.slice(-visibleSlides),
    ...products,
    ...products.slice(0, visibleSlides),
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => prev - 1);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleTransitionEnd = () => {
    if (currentIndex >= products.length + visibleSlides) {
      setIsTransitioning(false);
      setCurrentIndex(visibleSlides);
    }

    if (currentIndex === 0) {
      setIsTransitioning(false);
      setCurrentIndex(products.length);
    }
  };

  useEffect(() => {
    if (!isTransitioning) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    }
  }, [isTransitioning]);

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-top">
          <div className="home-left">
            <h1 className="home-title">{t("home.panelTitle")}</h1>

            <div className="home-description">
              <p>{t("home.description1")}</p>
              <p className="warning-text">{t("home.warning")}</p>
            </div>

            <div className="home-section">
              <h2>{t("home.howItWorks")}</h2>
              <ul>
                <li>{t("home.step1")}</li>
                <li>{t("home.step2")}</li>
                <li>{t("home.step3")}</li>
                <li>{t("home.step4")}</li>
              </ul>
            </div>
          </div>

          <div className="home-right">
            <div className="home-contact">
              <h2>{t("home.contact")}</h2>
              <p>{t("home.supportText")}</p>

              <div className="contact-info">
  <div>
    <strong>Email:</strong> cinebox.pnet@gmail.com
  </div>
  <div className="contact-buttons">
    
      href="https://wa.me/573185651516"
      target="_blank"
      rel="noopener noreferrer"
      className="contact-btn whatsapp"
    >
      WhatsApp
    </a>
    
      href="https://t.me/Cinebox_net"
      target="_blank"
      rel="noopener noreferrer"
      className="contact-btn telegram"
    >
      Telegram
    </a>
  </div>
</div>

      <div className="products-container">
        <h2 className="products-title">{t("home.platformsTitle")}</h2>

        <div className="carousel-wrapper">
          <button className="arrow left" onClick={prevSlide}>
            ❮
          </button>

          <div className="carousel">
            <div
              className="carousel-track"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translateX(-${
                  currentIndex * (100 / visibleSlides)
                }%)`,
                transition: isTransitioning
                  ? "transform 0.6s cubic-bezier(.77,0,.18,1)"
                  : "none",
              }}
            >
              {extendedProducts.map((product, index) => (
                <div className="carousel-item" key={index}>
                  <img src={product.image} alt={product.title} />
                  <h3>{product.description}</h3>
                </div>
              ))}
            </div>
          </div>

          <button className="arrow right" onClick={nextSlide}>
            ❯
          </button>
        </div>

        <p className="products-description">{t("home.availability")}</p>
      </div>
    </div>
  );
}

export default Home;
