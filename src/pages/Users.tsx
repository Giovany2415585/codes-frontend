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
  selected?: boolean;
}

interface Subject {
  id: number;
  name: string;
}

interface SavedSubject {
  id: number;
  name: string;
}

interface DangerousSubject {
  id: number;
  name: string;
}

function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmail[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [savedSubjects, setSavedSubjects] = useState<SavedSubject[]>([]);
  const [dangerousSubjects, setDangerousSubjects] = useState<DangerousSubject[]>([]);
  const [showSavedSubjects, setShowSavedSubjects] = useState(false);
  const [showDangerousSubjects, setShowDangerousSubjects] = useState(false);
  const [newDangerousSubject, setNewDangerousSubject] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<AuthorizedEmail | null>(null);
  const [emailSearch, setEmailSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"users" | "emails" | "subjects">("users");
  const [newUser, setNewUser] = useState({ first_name: "", email: "", phone: "", password: "" });
  const [newEmail, setNewEmail] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [bulkSubjectName, setBulkSubjectName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"edit" | "delete" | "deleteAllEmails" | "deleteSelected" | null>(null);
  const [modalEntity, setModalEntity] = useState<"user" | "email" | "subject" | null>(null);
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const subjectFileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [editValue, setEditValue] = useState("");

  const filteredEmails = authorizedEmails.filter((e) =>
    e.email.toLowerCase().includes(emailSearch.toLowerCase())
  );
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );
  const [emailFile, setEmailFile] = useState<File | null>(null);

  const selectedEmailIds = authorizedEmails.filter((e) => e.selected).map((e) => e.id);
  const allSelected = authorizedEmails.length > 0 && authorizedEmails.every((e) => e.selected);

  const toggleSelectEmail = (id: number) => {
    setAuthorizedEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const toggleSelectAll = () => {
    setAuthorizedEmails((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  };

  useEffect(() => {
    loadUsers();
    loadSavedSubjects();
    loadDangerousSubjects();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiFetch("/api/admin/users");
      setUsers(data);
    } catch {
      toast.error(t("users.loadUsersError"));
    }
  };

  const loadSavedSubjects = async () => {
    try {
      const data = await apiFetch("/api/admin/saved-subjects");
      setSavedSubjects(data);
    } catch {
      toast.error("Error cargando biblioteca de asuntos");
    }
  };

  const loadDangerousSubjects = async () => {
    try {
      const data = await apiFetch("/api/admin/dangerous-subjects");
      setDangerousSubjects(data);
    } catch {
      toast.error("Error cargando asuntos peligrosos");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { toast.error(t("users.selectUser")); return; }
    if (!resetPassword || resetPassword.length < 6) { toast.error(t("users.passwordMin")); return; }
    try {
      await apiFetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: "PUT",
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      toast.success(t("users.passwordUpdated"));
      setResetPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("users.passwordUpdateError"));
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
      setAuthorizedEmails(data.map((e: AuthorizedEmail) => ({ ...e, selected: false })));
    } catch {
      toast.error(t("users.loadEmailsError"));
    }
  };

  const handleDeleteSelectedEmails = async () => {
    if (!selectedUser || selectedEmailIds.length === 0) return;
    try {
      for (const id of selectedEmailIds) {
        await apiFetch(`/api/admin/authorized-emails/${id}`, { method: "DELETE" });
      }
      toast.success(`${selectedEmailIds.length} correo(s) eliminado(s)`);
      const data = await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails`);
      setAuthorizedEmails(data.map((e: AuthorizedEmail) => ({ ...e, selected: false })));
      setShowModal(false);
    } catch {
      toast.error("Error eliminando correos seleccionados");
    }
  };

  const handleDeleteAllEmails = async () => {
    if (!selectedUser) return;
    try {
      await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails/all`, {
        method: "DELETE",
      });
      toast.success("Todos los correos eliminados");
      setAuthorizedEmails([]);
      setShowModal(false);
    } catch {
      toast.error("Error eliminando correos");
    }
  };

  const handleBulkEmails = async () => {
    if (!emailFile || !selectedUser) { toast.error(t("users.selectUserFile")); return; }
    const text = await emailFile.text();
    const emails = text.split(";").map((e) => e.trim()).filter((e) => e.includes("@"));
    if (emails.length === 0) { toast.error(t("users.invalidEmails")); return; }
    try {
      await apiFetch("/api/admin/authorized-emails/bulk", {
        method: "POST",
        body: JSON.stringify({ user_id: selectedUser.id, emails }),
      });
      toast.success(t("users.emailsAdded", { count: emails.length }));
      const data = await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails`);
      setAuthorizedEmails(data.map((e: AuthorizedEmail) => ({ ...e, selected: false })));
      setEmailFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error(t("users.uploadEmailsError"));
    }
  };

  const handleBulkSubjects = async () => {
    if (!subjectFile || !selectedUser || !selectedEmail) { toast.error(t("users.selectEmailFirst")); return; }
    const text = await subjectFile.text();
    const subjects = text.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    if (subjects.length === 0) { toast.error(t("users.invalidSubjects")); return; }
    try {
      await apiFetch("/api/admin/subjects/bulk", {
        method: "POST",
        body: JSON.stringify({ user_id: selectedUser.id, authorized_email_id: selectedEmail.id, subjects }),
      });
      toast.success(t("users.subjectsAdded", { count: subjects.length }));
      const data = await apiFetch(`/api/admin/authorized-emails/${selectedEmail.id}/subjects`);
      setSubjects(data);
      setSubjectFile(null);
      if (subjectFileInputRef.current) subjectFileInputRef.current.value = "";
      loadSavedSubjects();
    } catch {
      toast.error(t("users.uploadSubjectsError"));
    }
  };

  const handleAssignSubjectToMultiple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { toast.error(t("users.selectUserFirst")); return; }
    if (selectedEmailIds.length === 0) { toast.error("Selecciona al menos un correo"); return; }
    if (!bulkSubjectName.trim()) { toast.error("Escribe el asunto"); return; }
    try {
      await apiFetch("/api/admin/subjects/bulk-multi-email", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          authorized_email_ids: selectedEmailIds,
          subject_name: bulkSubjectName,
        }),
      });
      toast.success(`Asunto asignado a ${selectedEmailIds.length} correos`);
      setBulkSubjectName("");
      setAuthorizedEmails((prev) => prev.map((e) => ({ ...e, selected: false })));
      loadSavedSubjects();
    } catch (err: any) {
      toast.error(err.message || "Error asignando asunto");
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
      const data = await apiFetch(`/api/admin/authorized-emails/${email.id}/subjects`);
      setSubjects(data);
    } catch {
      toast.error(t("users.loadSubjectsError"));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.first_name || !newUser.email || !newUser.password) { toast.error(t("users.requiredFields")); return; }
    if (newUser.password.length < 6) { toast.error(t("users.passwordMin")); return; }
    if (newUser.phone && !isValidPhoneNumber(newUser.phone)) { toast.error(t("users.invalidPhone")); return; }
    try {
      await apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify(newUser) });
      toast.success(t("users.userCreated"));
      setNewUser({ first_name: "", email: "", phone: "", password: "" });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || t("users.createUserError"));
    }
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { toast.error(t("users.selectUserFirst")); return; }
    if (!newEmail.trim()) { toast.error(t("users.emailRequired")); return; }
    try {
      await apiFetch("/api/admin/authorized-emails", {
        method: "POST",
        body: JSON.stringify({ user_id: selectedUser.id, email: newEmail }),
      });
      toast.success(t("users.emailAdded"));
      setNewEmail("");
      const data = await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails`);
      setAuthorizedEmails(data.map((e: AuthorizedEmail) => ({ ...e, selected: false })));
    } catch (err: any) {
      toast.error(err.message || t("users.addEmailError"));
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedEmail) { toast.error(t("users.selectEmailFirst")); return; }
    if (!newSubject.trim()) { toast.error(t("users.subjectRequired")); return; }
    try {
      await apiFetch("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify({ user_id: selectedUser.id, name: newSubject, authorized_email_id: selectedEmail.id }),
      });
      toast.success(t("users.subjectCreated"));
      setNewSubject("");
      const data = await apiFetch(`/api/admin/authorized-emails/${selectedEmail.id}/subjects`);
      setSubjects(data);
      loadSavedSubjects();
    } catch (err: any) {
      toast.error(err.message || t("users.createSubjectError"));
    }
  };

  const handleAddDangerousSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDangerousSubject.trim()) { toast.error("Escribe el asunto"); return; }
    try {
      await apiFetch("/api/admin/dangerous-subjects", {
        method: "POST",
        body: JSON.stringify({ name: newDangerousSubject }),
      });
      toast.success("Asunto peligroso agregado");
      setNewDangerousSubject("");
      loadDangerousSubjects();
    } catch (err: any) {
      toast.error(err.message || "Error agregando asunto");
    }
  };

  const handleDeleteDangerousSubject = async (id: number) => {
    try {
      await apiFetch(`/api/admin/dangerous-subjects/${id}`, { method: "DELETE" });
      toast.success("Asunto eliminado");
      loadDangerousSubjects();
    } catch {
      toast.error("Error eliminando asunto");
    }
  };

  const handleDeleteSavedSubject = async (id: number) => {
    try {
      await apiFetch(`/api/admin/saved-subjects/${id}`, { method: "DELETE" });
      toast.success("Asunto eliminado de la biblioteca");
      loadSavedSubjects();
    } catch {
      toast.error("Error eliminando asunto");
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
            body: JSON.stringify({ first_name: modalData.first_name, email: editValue, phone: modalData.phone, role: modalData.role }),
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
          await apiFetch(`/api/admin/users/${modalData.id}`, { method: "DELETE" });
          loadUsers();
        }
        if (modalEntity === "email") {
          await apiFetch(`/api/admin/authorized-emails/${modalData.id}`, { method: "DELETE" });
          if (selectedUser) {
            const data = await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails`);
            setAuthorizedEmails(data.map((e: AuthorizedEmail) => ({ ...e, selected: false })));
          }
        }
        if (modalEntity === "subject") {
          await apiFetch(`/api/admin/subjects/${modalData.id}`, { method: "DELETE" });
          if (selectedEmail) {
            const data = await apiFetch(`/api/admin/authorized-emails/${selectedEmail.id}/subjects`);
            setSubjects(data);
          }
        }
        toast.success(t("users.deleted"));
      }
      if (modalType === "deleteAllEmails") {
        await handleDeleteAllEmails();
        return;
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
              <div key={u.id} className={`user-chip ${selectedUser?.id === u.id ? "active" : ""}`}>
                <span onClick={() => handleSelectUser(u)} className="user-chip-text">
                  {u.email}
                  {u.role === "admin" && <span className="admin-badge">👑 ADMIN</span>}
                  {u.locked === 1 && <span className="locked-badge">🔒 BLOQUEADO</span>}
                </span>
                <div className="chip-actions">
                  {u.locked === 1 && (
                    <button className="unlock-btn" onClick={async () => {
                      try {
                        await apiFetch(`/api/admin/users/${u.id}/unlock`, { method: "PUT" });
                        toast.success("Usuario desbloqueado");
                        loadUsers();
                      } catch { toast.error("Error desbloqueando usuario"); }
                    }}>🔓</button>
                  )}
                  <div className="chip-btn edit" onClick={() => openEditModal("user", u)}>✎</div>
                  <div className="chip-btn delete" onClick={() => openDeleteModal("user", u)}>✕</div>
                </div>
              </div>
            ))}
          </div>
          <div className="users-search-bottom">
            <input type="text" placeholder={t("users.searchUser")} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          </div>
        </div>

        <div className="users-right">
          <div className="right-top">
            <div className="emails-header">
              <h3>{t("users.authorizedEmails")}</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {selectedEmailIds.length > 0 && (
                  <button
                    className="btn-danger-small"
                    onClick={() => { setModalType("deleteSelected"); setShowModal(true); }}
                  >
                    🗑 Eliminar {selectedEmailIds.length} seleccionado(s)
                  </button>
                )}
                {selectedUser && authorizedEmails.length > 0 && (
                  <button className="btn-danger-small" onClick={() => { setModalType("deleteAllEmails"); setShowModal(true); }}>
                    🗑 Quitar todos
                  </button>
                )}
              </div>
            </div>

            <div className="authorized-emails-container">
              {selectedUser && authorizedEmails.length > 0 && (
                <div className="select-all-row">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    Seleccionar todos
                  </label>
                  <span className="selected-count">{selectedEmailIds.length} seleccionados</span>
                </div>
              )}

              <div className="authorized-emails-wrapper">
                {filteredEmails.map((e) => (
                  <div key={e.id} className={`email-row ${selectedEmail?.id === e.id ? "active" : ""}`}>
                    {selectedUser && (
                      <input type="checkbox" checked={!!e.selected} onChange={() => toggleSelectEmail(e.id)} className="email-checkbox" />
                    )}
                    <span className="email-row-text" onClick={() => handleSelectEmail(e)}>{e.email}</span>
                    <div className="chip-actions">
                      <div className="chip-btn edit" onClick={() => openEditModal("email", e)}>✎</div>
                      <div className="chip-btn delete" onClick={() => openDeleteModal("email", e)}>✕</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="authorized-search-bottom">
                <input type="text" placeholder={t("users.searchEmail")} value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="right-bottom">
            <div className="subjects-header">
              <h3>{t("users.authorizedSubjects")}</h3>
              <button className="btn-toggle-saved" onClick={() => setShowSavedSubjects(!showSavedSubjects)}>
                {showSavedSubjects ? "▲ Ocultar biblioteca" : "▼ Asuntos guardados"}
              </button>
            </div>

            {showSavedSubjects && (
              <div className="saved-subjects-panel">
                <p className="saved-subjects-title">📚 Biblioteca de asuntos</p>
                <div className="saved-subjects-list">
                  {savedSubjects.length === 0 && <p className="empty-saved">Sin asuntos guardados aún</p>}
                  {savedSubjects.map((s) => (
                    <div key={s.id} className="saved-subject-chip">
                      <span onClick={() => {
                        if (selectedEmail) setNewSubject(s.name);
                        else setBulkSubjectName(s.name);
                        toast.success("Asunto copiado");
                      }}>{s.name}</span>
                      <div className="chip-btn delete" onClick={() => handleDeleteSavedSubject(s.id)}>✕</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="subjects-wrapper">
              {subjects.map((s) => (
                <div key={s.id} className="subject-chip">
                  {s.name}
                  <div className="chip-actions">
                    <div className="chip-btn edit" onClick={() => openEditModal("subject", s)}>✎</div>
                    <div className="chip-btn delete" onClick={() => openDeleteModal("subject", s)}>✕</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asuntos Peligrosos */}
          <div className="dangerous-section">
            <div className="subjects-header">
              <h3>🔴 Asuntos peligrosos</h3>
              <button className="btn-toggle-saved" onClick={() => setShowDangerousSubjects(!showDangerousSubjects)}>
                {showDangerousSubjects ? "▲ Ocultar" : "▼ Ver"}
              </button>
            </div>
            {showDangerousSubjects && (
              <div className="dangerous-panel">
                <p className="dangerous-desc">Estos asuntos bloquean automáticamente al cliente cuando los detecta.</p>
                <div className="saved-subjects-list">
                  {dangerousSubjects.length === 0 && <p className="empty-saved">Sin asuntos peligrosos configurados</p>}
                  {dangerousSubjects.map((s) => (
                    <div key={s.id} className="saved-subject-chip dangerous">
                      <span>⚠️ {s.name}</span>
                      <div className="chip-btn delete" onClick={() => handleDeleteDangerousSubject(s.id)}>✕</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddDangerousSubject} className="crud-form" style={{ marginTop: "10px" }}>
                  <input placeholder="Nuevo asunto peligroso..." value={newDangerousSubject} onChange={(e) => setNewDangerousSubject(e.target.value)} />
                  <button type="submit">Agregar</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="crud-panel">
        {activeSection === "users" && (
          <form onSubmit={handleCreateUser} className="crud-form">
            <input placeholder={t("users.name")} value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} />
            <input placeholder={t("users.email")} value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            <PhoneInput international defaultCountry="CO" placeholder={t("users.phone")} value={newUser.phone} onChange={(value) => setNewUser({ ...newUser, phone: value || "" })} />
            <input type="password" placeholder={t("users.password")} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            <button type="submit">{t("users.createUser")}</button>
          </form>
        )}

        {activeSection === "emails" && selectedUser && (
          <div className="crud-row">
            <form onSubmit={handleCreateEmail} className="crud-form">
              <input placeholder={t("users.newAuthorizedEmail")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <button type="submit">{t("users.addEmail")}</button>
            </form>
            <div className="bulk-upload">
              <input ref={fileInputRef} type="file" accept=".txt" onChange={(e) => setEmailFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={handleBulkEmails}>{t("users.uploadTxt")}</button>
            </div>
            <form onSubmit={handleResetPassword} className="crud-form">
              <input type="password" placeholder={t("users.newPassword")} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
              <button type="submit">{t("users.updatePassword")}</button>
            </form>

            {selectedEmailIds.length > 0 && (
              <form onSubmit={handleAssignSubjectToMultiple} className="crud-form bulk-subject-form">
                <p className="bulk-subject-label">Asignar asunto a {selectedEmailIds.length} correo(s) seleccionado(s):</p>
                <input placeholder="Escribe el asunto..." value={bulkSubjectName} onChange={(e) => setBulkSubjectName(e.target.value)} />
                <button type="submit">Asignar a todos</button>
              </form>
            )}
          </div>
        )}

        {activeSection === "subjects" && selectedUser && (
          <div className="crud-row">
            <form onSubmit={handleCreateSubject} className="crud-form">
              <input placeholder={t("users.newSubject")} value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              <button type="submit">{t("users.createSubject")}</button>
            </form>
            <div className="bulk-upload-subjects">
              <input ref={subjectFileInputRef} type="file" accept=".txt" onChange={(e) => setSubjectFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={handleBulkSubjects}>{t("users.uploadTxt")}</button>
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
                <input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                <button onClick={handleConfirm}>Actualizar</button>
                <button onClick={() => setShowModal(false)}>Cancelar</button>
              </>
            )}
            {modalType === "delete" && (
              <>
                <h3>{t("users.confirmDelete")}</h3>
                <button onClick={handleConfirm}>{t("users.confirm")}</button>
                <button onClick={() => setShowModal(false)}>{t("users.cancel")}</button>
              </>
            )}
            {modalType === "deleteSelected" && (
              <>
                <h3>¿Eliminar correos seleccionados?</h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                  Se eliminarán {selectedEmailIds.length} correo(s) seleccionado(s) de {selectedUser?.first_name}. Esta acción no se puede deshacer.
                </p>
                <button onClick={handleDeleteSelectedEmails}>Eliminar</button>
                <button onClick={() => setShowModal(false)}>Cancelar</button>
              </>
            )}
            {modalType === "deleteAllEmails" && (
              <>
                <h3>¿Quitar todos los correos?</h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                  Se eliminarán todos los correos autorizados de {selectedUser?.first_name}. Esta acción no se puede deshacer.
                </p>
                <button onClick={handleDeleteAllEmails}>Eliminar todos</button>
                <button onClick={() => setShowModal(false)}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
