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

  const [visibleSlides, setVisibleSlides] = useState(2);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setVisibleSlides(1);
      } else {
        setVisibleSlides(2);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(visibleSlides);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [carouselSweep, setCarouselSweep] = useState(false);

  const triggerCarouselSweep = () => {
    setCarouselSweep(true);
    setTimeout(() => setCarouselSweep(false), 900);
  };

  const extendedProducts = [
    ...products.slice(-visibleSlides),
    ...products,
    ...products.slice(0, visibleSlides),
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => prev + 1);
    triggerCarouselSweep();
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => prev - 1);
    triggerCarouselSweep();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 10000);

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
  const [planesStartIndex, setPlanesStartIndex] = useState(0);
  const [planesFade, setPlanesFade] = useState(true);

  useEffect(() => {
    const loadPlanes = async () => {
      try {
        const res = await fetch("https://onlinebox.lat/api/admin/precios/publico");
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

  // Ventana deslizante: muestra 2 planes a la vez, avanza de 1 en 1, cíclico
  const PLANES_VISIBLE = 2;

  useEffect(() => {
    if (planes.length <= PLANES_VISIBLE) return;

    const interval = setInterval(() => {
      setPlanesFade(false);
      setTimeout(() => {
        setPlanesStartIndex((prev) => (prev + 1) % planes.length);
        setPlanesFade(true);
      }, 900);
    }, 10000);

    return () => clearInterval(interval);
  }, [planes.length]);

  const goToPlanIndex = (index: number) => {
    setPlanesFade(false);
    setTimeout(() => {
      setPlanesStartIndex(((index % planes.length) + planes.length) % planes.length);
      setPlanesFade(true);
    }, 900);
  };

  const nextPlan = () => goToPlanIndex(planesStartIndex + 1);
  const prevPlan = () => goToPlanIndex(planesStartIndex - 1);

  const visiblePlanes =
    planes.length <= PLANES_VISIBLE
      ? planes
      : Array.from({ length: PLANES_VISIBLE }, (_, i) => planes[(planesStartIndex + i) % planes.length]);

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

  // Limpia bullets/emojis rotos al inicio del texto (incluye el carácter de
  // reemplazo � que aparece cuando un emoji se corrompió al guardarse).
  const cleanFeatureText = (text: string) => {
    return text
      .replace(/^[\s\u{1F000}-\u{1FFFF}\u{2000}-\u{3300}\uFFFD?❓🔘●○•\-\*]+/u, "")
      .trim();
  };

  return (
    <div className="home-container">
      {/* ── PLANES Y PRECIOS DISPONIBLES (PRIMERO) ─────────────────────────── */}
      {!loadingPlanes && planes.length > 0 && (
        <div className="plans-container">
          <div className="plans-header">
            <span className="plans-badge">📦 Stock disponible</span>
            <h2 className="plans-title">Planes disponibles ahora</h2>
          </div>

          <div className="plans-carousel-wrapper">
            {planes.length > PLANES_VISIBLE && (
              <button className="plans-arrow left" onClick={prevPlan} aria-label="Anterior">
                ❮
              </button>
            )}

            <div className="plans-grid-wrapper">
              {!planesFade && <div className="plans-sweep" />}
              <div className={`plans-grid ${planesFade ? "plans-fade-in" : "plans-fade-out"}`}>
                {visiblePlanes.map((plan) => {
              const features = getFeatureLines(plan.descripcion);
              const proveedor = getHighlight(plan.descripcion);
              return (
                <div className="plan-card" key={plan.id}>
                  <div className="plan-card-glow" />

                  {plan.tipo_cuenta && (
                    <span className="plan-tipo-badge">{plan.tipo_cuenta}</span>
                  )}

                  <h3 className="plan-name">{plan.producto}</h3>

                  <div className="plan-price-row">
                    <div className="plan-price-main">
                      <span className="plan-price-currency">COP</span>
                      <span className="plan-price-value">{formatCOP(plan.precio_cop)}</span>
                    </div>
                    <div className="plan-price-alt">
                      ≈ ${plan.precio_usdt} USDT
                    </div>
                  </div>

                  {proveedor && <p className="plan-highlight">{cleanFeatureText(proveedor)}</p>}

                  {features.length > 0 && (
                    <ul className="plan-features">
                      {features.map((f, i) => (
                        <li key={i}>
                          <span className="plan-feature-icon">✓</span>
                          <span>{cleanFeatureText(f)}</span>
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

            {planes.length > PLANES_VISIBLE && (
              <button className="plans-arrow right" onClick={nextPlan} aria-label="Siguiente">
                ❯
              </button>
            )}
          </div>

          {planes.length > PLANES_VISIBLE && (
            <div className="plans-dots">
              {planes.map((_, i) => (
                <span
                  key={i}
                  className={`plans-dot ${i === planesStartIndex ? "active" : ""}`}
                  onClick={() => goToPlanIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CARRUSEL DE PLATAFORMAS ─────────────────────────────────────────── */}
      <div className="products-container">
        <h2 className="products-title">{t("home.platformsTitle")}</h2>

        <div className="carousel-wrapper">
          <button className="arrow left" onClick={prevSlide}>
            ❮
          </button>

          <div className="carousel">
            {carouselSweep && <div className="plans-sweep" />}
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

      {/* ── PANEL DE ADMINISTRACIÓN / INFO ──────────────────────────────────── */}
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
    </div>
  );
}

export default Home;