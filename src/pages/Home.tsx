import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./Home.css";

import img1 from "../assets/plataforma1.jpg";
import img2 from "../assets/plataforma2.jpg";
import img3 from "../assets/plataforma3.jpg";
import img4 from "../assets/plataforma4.jpg";
import img5 from "../assets/plataforma5.jpg";

interface Precio {
  id: number;
  producto: string;
  precio_cop: number;
  precio_usdt: number;
  tipo_cuenta?: string;
  descripcion?: string;
}

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

  // ── Planes / Precios (carrusel de productos en stock) ──────────────────────
  const [planes, setPlanes] = useState<Precio[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);

  useEffect(() => {
    const loadPlanes = async () => {
      try {
        const res = await fetch("/api/admin/precios/publico");
        if (!res.ok) throw new Error("Error cargando planes");
        const data = await res.json();
        setPlanes(data);
      } catch {
        setPlanes([]);
      } finally {
        setLoadingPlanes(false);
      }
    };
    loadPlanes();
  }, []);

  const formatCOP = (value: number) =>
    `$${Math.round(Number(value)).toLocaleString("es-CO")}`;

  // Extrae la primera línea "fuerte" de la descripción para mostrar como destacado
  const getHighlight = (descripcion?: string) => {
    if (!descripcion) return null;
    const lines = descripcion.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines[0] || null;
  };

  const getFeatureLines = (descripcion?: string) => {
    if (!descripcion) return [];
    return descripcion
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(1);
  };

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
                  <a
                    href="https://wa.me/573185651516"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn whatsapp"
                  >
                    WhatsApp
                  </a>
                  <a
                    href="https://t.me/Cinebox_net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn telegram"
                  >
                    Telegram
                  </a>
                </div>
              </div>
            </div>
          </div>
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

      {/* ── PLANES Y PRECIOS DISPONIBLES ───────────────────────────────────── */}
      {!loadingPlanes && planes.length > 0 && (
        <div className="plans-container">
          <div className="plans-header">
            <span className="plans-badge">📦 Stock disponible</span>
            <h2 className="plans-title">Planes disponibles ahora</h2>
            <p className="plans-subtitle">
              Cuentas listas para activar de inmediato. Disponibilidad limitada.
            </p>
          </div>

          <div className="plans-grid">
            {planes.map((plan) => {
              const highlight = getHighlight(plan.descripcion);
              const features = getFeatureLines(plan.descripcion);
              return (
                <div className="plan-card" key={plan.id}>
                  <div className="plan-card-glow" />
                  <div className="plan-card-header">
                    <h3 className="plan-name">{plan.producto}</h3>
                    {plan.tipo_cuenta && (
                      <span className="plan-tipo-badge">{plan.tipo_cuenta}</span>
                    )}
                  </div>

                  <div className="plan-price-row">
                    <div className="plan-price-main">
                      <span className="plan-price-currency">COP</span>
                      <span className="plan-price-value">{formatCOP(plan.precio_cop)}</span>
                    </div>
                    <div className="plan-price-alt">
                      ≈ ${plan.precio_usdt} USDT
                    </div>
                  </div>

                  {highlight && <p className="plan-highlight">{highlight}</p>}

                  {features.length > 0 && (
                    <ul className="plan-features">
                      {features.map((f, i) => (
                        <li key={i}>
                          <span className="plan-feature-icon">✓</span>
                          <span>{f.replace(/^[🔘●○•\-\*]\s*/, "")}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="plan-cta-row">
                    <a
                      href={`https://wa.me/573185651516?text=${encodeURIComponent(
                        `Hola, quiero contratar: ${plan.producto}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="plan-cta whatsapp"
                    >
                      <span className="plan-cta-icon">💬</span> Contratar por WhatsApp
                    </a>
                    <a
                      href={`https://t.me/Cinebox_net?text=${encodeURIComponent(
                        `Hola, quiero contratar: ${plan.producto}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="plan-cta telegram"
                    >
                      <span className="plan-cta-icon">✈️</span> Contratar por Telegram
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;