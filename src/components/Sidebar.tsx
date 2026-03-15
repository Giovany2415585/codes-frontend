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

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-top">
        <h2>{t("sidebar.title")}</h2>

        <img src={logo} alt="Kitty Codes Logo" className="sidebar-logo" />

        <nav>
          <Link to="/home">{t("sidebar.home")}</Link>
          <Link to="/codes">{t("sidebar.codes")}</Link>
          <Link to="/authorizedEmails">
            {t("sidebar.authorizedEmails")}
          </Link>
          {user.role === "admin" && (
            <Link to="/users">{t("sidebar.users")}</Link>
          )}
          <Link to="/profile">{t("sidebar.profile")}</Link>
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