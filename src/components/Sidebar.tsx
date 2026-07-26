import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { apiFetch } from "../services/api";
import logo from "../assets/logo.png";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
}

function Sidebar({ isOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const avatars = [
    "https://i.pravatar.cc/150?img=1",
    "https://i.pravatar.cc/150?img=2",
    "https://i.pravatar.cc/150?img=3",
    "https://i.pravatar.cc/150?img=4",
    "https://i.pravatar.cc/150?img=5",
    "https://i.pravatar.cc/150?img=6",
    "https://i.pravatar.cc/150?img=7",
    "https://i.pravatar.cc/150?img=8",
    "https://i.pravatar.cc/150?img=9",
    "https://i.pravatar.cc/150?img=10",
  ];

  const [avatar, setAvatar] = useState(avatars[0]);

  const changeAvatar = () => {
    const randomIndex = Math.floor(Math.random() * avatars.length);
    setAvatar(avatars[randomIndex]);
  };

  // ── Notificaciones de Seguridad (badge tipo Facebook/Instagram) ────────────
  const [securityUnread, setSecurityUnread] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const checkSecurity = async () => {
      try {
        const logs = await apiFetch("/api/admin/security-logs");
        const lastSeen = Number(localStorage.getItem("security_logs_last_seen") || "0");
        const unread = Array.isArray(logs)
          ? logs.filter((l: any) => new Date(l.locked_at).getTime() > lastSeen).length
          : 0;
        setSecurityUnread(unread);
      } catch {
        // silencioso, no bloquea el sidebar
      }
    };

    checkSecurity();
    const interval = setInterval(checkSecurity, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (location.pathname === "/security") {
      localStorage.setItem("security_logs_last_seen", String(Date.now()));
      setSecurityUnread(0);
    }
  }, [location.pathname]);

  if (!user) return null;

  const formattedDate =
    user.lastConnection &&
    !isNaN(Date.parse(user.lastConnection.replace(" ", "T")))
      ? new Date(user.lastConnection.replace(" ", "T")).toLocaleString()
      : "—";

  const navItems = [
    { to: "/home", icon: "🏠", label: t("sidebar.home") },
    { to: "/codes", icon: "🔑", label: t("sidebar.codes") },
    { to: "/authorizedEmails", icon: "📧", label: t("sidebar.authorizedEmails") },
    ...(user.role === "admin" ? [
      { to: "/users", icon: "👥", label: t("sidebar.users") },
      { to: "/rentals", icon: "🎬", label: "Alquileres" },
      { to: "/inventario", icon: "📦", label: "Inventario" },      // ← AGREGAR ESTA LÍNEA
      { to: "/precios", icon: "💰", label: "Precios" },            // ← AGREGAR ESTA LÍNEA
      { to: "/dashboard", icon: "📊", label: "Actividad" },
      { to: "/security", icon: "🔒", label: "Seguridad" },
    ] : []),
    { to: "/profile", icon: "👤", label: t("sidebar.profile") },
  ];

  return (
    <div className={`sidebar ${isOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      {/* Botón toggle solo en desktop */}
      <button
        className="sidebar-toggle-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? "▶" : "◀"}
      </button>

      <div className="sidebar-top">
        <h2>{t("sidebar.title")}</h2>
        <img src={logo} alt="CINEBOX Logo" className="sidebar-logo" />

        <nav>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-label={item.label}
              style={{ position: "relative" }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.to === "/security" && securityUnread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 10,
                    background: "#ef4444",
                    color: "white",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    borderRadius: "999px",
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    lineHeight: 1,
                    boxShadow: "0 0 0 2px rgba(0,0,0,0.15)",
                  }}
                >
                  {securityUnread > 9 ? "9+" : securityUnread}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-profile">
          <img src={avatar} alt="Profile" onClick={changeAvatar} />
          <div className="profile-info">
            <p className="profile-name">{user.first_name}</p>
            <p className="profile-last">
              {t("profile.lastConnection")}:
              <br />
              {formattedDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;