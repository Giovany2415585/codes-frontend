import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/logo.png";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
}

function Sidebar({ isOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);

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
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
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
