import { Outlet, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import "./Layout.css";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "../context/ThemeContext";

function Layout() {
  const { t, i18n } = useTranslation();
  const { logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} />

      <div className="main-area">
        <header className="navbar">
          <div className="nav-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>

            <h3>{t("navbar.panel")}</h3>
          </div>

          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <select
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              defaultValue={i18n.language}
              className="lang-select"
            >
              <option value="es">🇪🇸 ES</option>
              <option value="en">🇺🇸 EN</option>
              <option value="pt">🇧🇷 PT</option>
            </select>

            <button className="logout-btn" onClick={handleLogout}>
              {t("navbar.logout")}
            </button>
          </div>
        </header>

   <main className="content">
          <Outlet />
        </main>
        <footer className="footer">
          © {new Date().getFullYear()} CINEBOX.NET
        </footer>
      </div>
    </div>
  );
}
export default Layout;