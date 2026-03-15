import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import "./Users.css";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { apiFetch } from "../services/api";
import { useRef } from "react";

interface User {
  id: number;
  first_name: string;
  email: string;
  phone: string;
  role: string;
  locked?: number;
}

interface AuthorizedEmail {
  id: number;
  email: string;
}

interface Subject {
  id: number;
  name: string;
}

function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmail[]>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [resetPassword, setResetPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<AuthorizedEmail | null>(
    null,
  );
  const [emailSearch, setEmailSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [activeSection, setActiveSection] = useState<
    "users" | "emails" | "subjects"
  >("users");
  const [newUser, setNewUser] = useState({
    first_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [newEmail, setNewEmail] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"edit" | "delete" | null>(null);
  const [modalEntity, setModalEntity] = useState<
    "user" | "email" | "subject" | null
  >(null);
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const subjectFileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const filteredEmails = authorizedEmails.filter((e) =>
    e.email.toLowerCase().includes(emailSearch.toLowerCase()),
  );
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error(t("users.selectUser"));
      return;
    }

    if (!resetPassword || resetPassword.length < 6) {
      toast.error(t("users.passwordMin"));
      return;
    }

    try {
      await apiFetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: "PUT",
        body: JSON.stringify({ newPassword: resetPassword }),
      });

      toast.success(t("users.passwordUpdated"));
      setResetPassword("");
    } catch (err: any) {
      toast.error(
        toast.error(
          err?.response?.data?.message || t("users.passwordUpdateError"),
        ),
      );
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiFetch("/api/admin/users");
      setUsers(data);
    } catch {
      toast.error(t("users.loadUsersError"));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedEmail) {
          setSelectedEmail(null);
          setSubjects([]);
          setActiveSection("emails");
          return;
        }

        if (selectedUser) {
          setSelectedUser(null);
          setSelectedEmail(null);
          setAuthorizedEmails([]);
          setSubjects([]);
          setActiveSection("users");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUser, selectedEmail]);

  const handleSelectUser = async (u: User) => {
    if (selectedUser?.id === u.id) {
      setSelectedUser(null);
      setSelectedEmail(null);
      setAuthorizedEmails([]);
      setSubjects([]);
      setActiveSection("users");
      return;
    }

    setSelectedUser(u);
    setSelectedEmail(null);
    setSubjects([]);
    setActiveSection("emails");

    try {
      const data = await apiFetch(`/api/admin/users/${u.id}/authorized-emails`);
      setAuthorizedEmails(data);
    } catch {
      toast.error(t("users.loadEmailsError"));
    }
  };
  const handleBulkEmails = async () => {
    if (!emailFile || !selectedUser) {
      toast.error(t("users.selectUserFile"));
      return;
    }

    const text = await emailFile.text();

    const emails = text
      .split(";")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      toast.error(t("users.invalidEmails"));
      return;
    }

    try {
      await apiFetch("/api/admin/authorized-emails/bulk", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          emails,
        }),
      });

      toast.success(t("users.emailsAdded", { count: emails.length }));

      const data = await apiFetch(
        `/api/admin/users/${selectedUser.id}/authorized-emails`,
      );

      setAuthorizedEmails(data);
      setEmailFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      toast.error(t("users.uploadEmailsError"));
    }
  };

  const handleBulkSubjects = async () => {
    if (!subjectFile || !selectedUser || !selectedEmail) {
      toast.error(t("users.selectEmailFirst"));
      return;
    }

    const text = await subjectFile.text();

    const subjects = text
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subjects.length === 0) {
      toast.error(t("users.invalidSubjects"));
      return;
    }

    try {
      await apiFetch("/api/admin/subjects/bulk", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          authorized_email_id: selectedEmail.id,
          subjects,
        }),
      });

      toast.success(t("users.subjectsAdded", { count: subjects.length }));

      const data = await apiFetch(
        `/api/admin/authorized-emails/${selectedEmail.id}/subjects`,
      );

      setSubjects(data);
      setSubjectFile(null);

      if (subjectFileInputRef.current) {
        subjectFileInputRef.current.value = "";
      }
    } catch {
      toast.error(t("users.uploadSubjectsError"));
    }
  };

  const handleSelectEmail = async (email: AuthorizedEmail) => {
    if (selectedEmail?.id === email.id) {
      setSelectedEmail(null);
      setSubjects([]);
      setActiveSection("emails");
      return;
    }

    setSelectedEmail(email);
    setActiveSection("subjects");

    try {
      const data = await apiFetch(
        `/api/admin/authorized-emails/${email.id}/subjects`,
      );
      setSubjects(data);
    } catch {
      toast.error(t("users.loadSubjectsError"));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.first_name || !newUser.email || !newUser.password) {
      toast.error(t("users.requiredFields"));
      return;
    }

    if (newUser.password.length < 6) {
      toast.error(t("users.passwordMin"));
      return;
    }

    if (newUser.phone && !isValidPhoneNumber(newUser.phone)) {
      toast.error(t("users.invalidPhone"));
      return;
    }

    try {
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });

      toast.success(t("users.userCreated"));

      setNewUser({
        first_name: "",
        email: "",
        phone: "",
        password: "",
      });

      loadUsers();
    } catch (err: any) {
      toast.error(err.message || t("users.createUserError"));
    }
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error(t("users.selectUserFirst"));
      return;
    }

    if (!newEmail.trim()) {
      toast.error(t("users.emailRequired"));
      return;
    }

    try {
      await apiFetch("/api/admin/authorized-emails", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          email: newEmail,
        }),
      });

      toast.success(t("users.emailAdded"));
      setNewEmail("");

      const data = await apiFetch(
        `/api/admin/users/${selectedUser.id}/authorized-emails`,
      );
      setAuthorizedEmails(data);
    } catch (err: any) {
      toast.error(err.message || t("users.addEmailError"));
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !selectedEmail) {
      toast.error(t("users.selectEmailFirst"));
      return;
    }

    if (!newSubject.trim()) {
      toast.error(t("users.subjectRequired"));
      return;
    }

    try {
      await apiFetch("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          name: newSubject,
          authorized_email_id: selectedEmail.id,
        }),
      });

      toast.success(t("users.subjectCreated"));
      setNewSubject("");

      const data = await apiFetch(
        `/api/admin/authorized-emails/${selectedEmail.id}/subjects`,
      );
      setSubjects(data);
    } catch (err: any) {
      toast.error(err.message || t("users.createSubjectError"));
    }
  };

  const openEditModal = (entity: "user" | "email" | "subject", data: any) => {
    setModalType("edit");
    setModalEntity(entity);
    setModalData(data);
    setEditValue(data.email || data.name || data.first_name);
    setShowModal(true);
  };

  const openDeleteModal = (entity: "user" | "email" | "subject", data: any) => {
    setModalType("delete");
    setModalEntity(entity);
    setModalData(data);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!modalEntity || !modalData) return;

    try {
      if (modalType === "edit") {
        if (modalEntity === "user") {
          await apiFetch(`/api/admin/users/${modalData.id}`, {
            method: "PUT",
            body: JSON.stringify({
              first_name: modalData.first_name,
              email: editValue,
              phone: modalData.phone,
              role: modalData.role,
            }),
          });
          loadUsers();
        }

        if (modalEntity === "email") {
          await apiFetch(`/api/admin/authorized-emails/${modalData.id}`, {
            method: "PUT",
            body: JSON.stringify({ email: editValue }),
          });
          if (selectedUser) handleSelectUser(selectedUser);
        }

        if (modalEntity === "subject") {
          await apiFetch(`/api/admin/subjects/${modalData.id}`, {
            method: "PUT",
            body: JSON.stringify({ name: editValue }),
          });
          if (selectedEmail) handleSelectEmail(selectedEmail);
        }

        toast.success(t("users.updated"));
      }

      if (modalType === "delete") {
        if (modalEntity === "user") {
          await apiFetch(`/api/admin/users/${modalData.id}`, {
            method: "DELETE",
          });

          loadUsers();
        }

        if (modalEntity === "email") {
          await apiFetch(`/api/admin/authorized-emails/${modalData.id}`, {
            method: "DELETE",
          });

          if (selectedUser) {
            const data = await apiFetch(
              `/api/admin/users/${selectedUser.id}/authorized-emails`,
            );

            setAuthorizedEmails(data);
          }
        }

        if (modalEntity === "subject") {
          await apiFetch(`/api/admin/subjects/${modalData.id}`, {
            method: "DELETE",
          });

          if (selectedEmail) {
            const data = await apiFetch(
              `/api/admin/authorized-emails/${selectedEmail.id}/subjects`,
            );

            setSubjects(data);
          }
        }

        toast.success(t("users.deleted"));
      }

      setShowModal(false);
    } catch (err) {
      toast.error(t("users.operationError"));
    }
  };

  return (
    <div className="users-container">
      <div className="users-card">
        <div className="users-left">
          <h2>{t("users.title")}</h2>
          <div className="users-list">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`user-chip ${selectedUser?.id === u.id ? "active" : ""}`}
              >
                <span
                  onClick={() => handleSelectUser(u)}
                  className="user-chip-text"
                >
                  {u.email}

                  {u.role === "admin" && (
                    <span className="admin-badge">👑 ADMIN</span>
                  )}

                  {u.locked === 1 && (
                    <span className="locked-badge">🔒 BLOQUEADO</span>
                  )}
                </span>

                <div className="chip-actions">
                  {u.locked === 1 && (
                    <button
                      className="unlock-btn"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/admin/users/${u.id}/unlock`, {
                            method: "PUT",
                          });

                          toast.success("Usuario desbloqueado");
                          loadUsers();
                        } catch {
                          toast.error("Error desbloqueando usuario");
                        }
                      }}
                    >
                      🔓
                    </button>
                  )}

                  <div
                    className="chip-btn edit"
                    onClick={() => openEditModal("user", u)}
                  >
                    ✎
                  </div>

                  <div
                    className="chip-btn delete"
                    onClick={() => openDeleteModal("user", u)}
                  >
                    ✕
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="users-search-bottom">
            <input
              type="text"
              placeholder={t("users.searchUser")}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="users-right">
          <div className="right-top">
            <h3>{t("users.authorizedEmails")}</h3>

            <div className="authorized-emails-container">
              <div className="authorized-emails-wrapper">
                {filteredEmails.map((e) => (
                  <div
                    key={e.id}
                    className={`subject-chip ${
                      selectedEmail?.id === e.id ? "active" : ""
                    }`}
                  >
                    <span onClick={() => handleSelectEmail(e)}>{e.email}</span>

                    <div className="chip-actions">
                      <div
                        className="chip-btn edit"
                        onClick={() => openEditModal("email", e)}
                      >
                        ✎
                      </div>
                      <div
                        className="chip-btn delete"
                        onClick={() => openDeleteModal("email", e)}
                      >
                        ✕
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="authorized-search-bottom">
                <input
                  type="text"
                  placeholder={t("users.searchEmail")}
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="right-bottom">
            <h3>{t("users.authorizedSubjects")}</h3>
            <div className="subjects-wrapper">
              {subjects.map((s) => (
                <div key={s.id} className="subject-chip">
                  {s.name}

                  <div className="chip-actions">
                    <div
                      className="chip-btn edit"
                      onClick={() => openEditModal("subject", s)}
                    >
                      ✎
                    </div>
                    <div
                      className="chip-btn delete"
                      onClick={() => openDeleteModal("subject", s)}
                    >
                      ✕
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="crud-panel">
        {activeSection === "users" && (
          <form onSubmit={handleCreateUser} className="crud-form">
            <input
              placeholder={t("users.name")}
              value={newUser.first_name}
              onChange={(e) =>
                setNewUser({ ...newUser, first_name: e.target.value })
              }
            />
            <input
              placeholder={t("users.email")}
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />
            <PhoneInput
              international
              defaultCountry="CO"
              placeholder={t("users.phone")}
              value={newUser.phone}
              onChange={(value) =>
                setNewUser({ ...newUser, phone: value || "" })
              }
            />
            <input
              type="password"
              placeholder={t("users.password")}
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />
            <button type="submit">{t("users.createUser")}</button>
          </form>
        )}

        {activeSection === "emails" && selectedUser && (
          <div className="crud-row">
            <form onSubmit={handleCreateEmail} className="crud-form">
              <input
                placeholder={t("users.newAuthorizedEmail")}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button type="submit">{t("users.addEmail")}</button>
            </form>
            <div className="bulk-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={(e) => setEmailFile(e.target.files?.[0] || null)}
              />

              <button type="button" onClick={handleBulkEmails}>
                {t("users.uploadTxt")}
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="crud-form">
              <input
                type="password"
                placeholder={t("users.newPassword")}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
              <button type="submit">{t("users.updatePassword")}</button>
            </form>
          </div>
        )}
        {activeSection === "subjects" && selectedUser && (
          <div className="crud-row">
            <form onSubmit={handleCreateSubject} className="crud-form">
              <input
                placeholder={t("users.newSubject")}
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
              <button type="submit">{t("users.createSubject")}</button>
            </form>

            <div className="bulk-upload-subjects">
              <input
                ref={subjectFileInputRef}
                type="file"
                accept=".txt"
                onChange={(e) => setSubjectFile(e.target.files?.[0] || null)}
              />

              <button type="button" onClick={handleBulkSubjects}>
                {t("users.uploadTxt")}
              </button>
            </div>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            {modalType === "edit" && (
              <>
                <h3>{t("users.edit")}</h3>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
                <button onClick={handleConfirm}>Actualizar</button>
                <button onClick={() => setShowModal(false)}>Cancelar</button>
              </>
            )}

            {modalType === "delete" && (
              <>
                <h3>{t("users.confirmDelete")}</h3>
                <button onClick={handleConfirm}>{t("users.confirm")}</button>
                <button onClick={() => setShowModal(false)}>
                  {t("users.cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
