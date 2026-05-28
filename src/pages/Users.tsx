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
  tag_id?: number | null;
}

interface EmailTag {
  id: number;
  name: string;
  color: string;
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

interface Plataforma {
  id: number;
  nombre: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-CO");
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
  const [modalType, setModalType] = useState<"edit" | "delete" | "deleteAllEmails" | "deleteSelected" | "crearAlquiler" | null>(null);
  const [modalEntity, setModalEntity] = useState<"user" | "email" | "subject" | null>(null);
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const subjectFileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [bulkEmailList, setBulkEmailList] = useState("");
  const [showBulkEmailList, setShowBulkEmailList] = useState(false);
  const [emailTags, setEmailTags] = useState<EmailTag[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [showTagManager, setShowTagManager] = useState(false);

  // ── Estado para alquiler rápido ─────────────────────────────────────────────
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [formAlquilerRapido, setFormAlquilerRapido] = useState({
    plataforma: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    dias: "30",
    precio: "",
    divisa: "COP",
    notas: "",
    password: "",
  });
  const [nuevaPlataformaRapida, setNuevaPlataformaRapida] = useState("");
  const [showNuevaPlataformaRapida, setShowNuevaPlataformaRapida] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredEmails = authorizedEmails.filter((e) => {
    const matchesSearch = e.email.toLowerCase().includes(emailSearch.toLowerCase());
    const matchesTag = activeTagFilter === null || 
      (activeTagFilter === -1 ? !e.tag_id : e.tag_id === activeTagFilter);
    return matchesSearch && matchesTag;
  });

  const selectedEmailIds = authorizedEmails.filter((e) => e.selected).map((e) => e.id);
  const selectedEmailAddresses = authorizedEmails.filter((e) => e.selected).map((e) => e.email);
  const allSelected = authorizedEmails.length > 0 && authorizedEmails.every((e) => e.selected);

  const toggleSelectEmail = (id: number) => {
    setAuthorizedEmails((prev) => prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)));
  };

  const toggleSelectAll = () => {
    setAuthorizedEmails((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  };

  useEffect(() => {
    loadUsers();
    loadSavedSubjects();
    loadDangerousSubjects();
    loadEmailTags();
    loadPlataformas();
  }, []);

  const loadPlataformas = async () => {
    try {
      const data = await apiFetch("/api/alquileres/plataformas");
      setPlataformas(data);
    } catch {
      // fallback silencioso
    }
  };

  const loadEmailTags = async () => {
    try {
      const data = await apiFetch("/api/admin/email-tags");
      setEmailTags(data);
    } catch {}
  };

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
        if (showModal) { setShowModal(false); return; }
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
  }, [selectedUser, selectedEmail, showModal]);

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
      // Bulk delete — una sola notificación Telegram
      await apiFetch("/api/admin/authorized-emails/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ authorized_email_ids: selectedEmailIds }),
      });
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
      await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails/all`, { method: "DELETE" });
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

  const handleClearSubjectsFromSelected = async () => {
    if (!selectedUser || selectedEmailIds.length === 0) return;
    try {
      await apiFetch("/api/admin/authorized-emails/bulk-subjects", {
        method: "DELETE",
        body: JSON.stringify({ authorized_email_ids: selectedEmailIds }),
      });
      toast.success(`Asuntos eliminados de ${selectedEmailIds.length} correo(s)`);
      setAuthorizedEmails((prev) => prev.map((e) => ({ ...e, selected: false })));
      setSubjects([]);
      setSelectedEmail(null);
      setShowModal(false);
    } catch {
      toast.error("Error eliminando asuntos");
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
        body: JSON.stringify({ user_id: selectedUser.id, authorized_email_ids: selectedEmailIds, subject_name: bulkSubjectName }),
      });
      toast.success(`Asunto asignado a ${selectedEmailIds.length} correos`);
      setBulkSubjectName("");
      setAuthorizedEmails((prev) => prev.map((e) => ({ ...e, selected: false })));
      loadSavedSubjects();
    } catch (err: any) {
      toast.error(err.message || "Error asignando asunto");
    }
  };

  const handleBulkEmailList = async () => {
    if (!selectedUser) { toast.error(t("users.selectUserFirst")); return; }
    // Parsear cada línea — tomar solo el correo (primera parte antes de tab/espacio)
    const emails = bulkEmailList.split("\n")
      .map((line) => line.trim().split(/\t|  +/)[0].trim().toLowerCase())
      .filter((e) => e.includes("@") && e.includes("."));
    if (emails.length === 0) { toast.error("No se encontraron correos válidos"); return; }
    try {
      await apiFetch("/api/admin/authorized-emails/bulk", {
        method: "POST",
        body: JSON.stringify({ user_id: selectedUser.id, emails }),
      });
      toast.success(`${emails.length} correo(s) agregado(s)`);
      const data = await apiFetch(`/api/admin/users/${selectedUser.id}/authorized-emails`);
      setAuthorizedEmails(data.map((e: AuthorizedEmail) => ({ ...e, selected: false })));
      setBulkEmailList("");
      setShowBulkEmailList(false);
    } catch {
      toast.error("Error agregando correos");
    }
  };

  const handleRemoveTag = async (emailId: number) => {
    try {
      await apiFetch(`/api/admin/authorized-emails/${emailId}/tag`, {
        method: "PUT",
        body: JSON.stringify({ tag_id: null }),
      });
      setAuthorizedEmails((prev) => prev.map((e) => e.id === emailId ? { ...e, tag_id: null } : e));
      toast.success("Etiqueta removida");
    } catch {
      toast.error("Error removiendo etiqueta");
    }
  };

  const handleRemoveTagFromSelected = async () => {
    if (selectedEmailIds.length === 0) return;
    try {
      await apiFetch("/api/admin/authorized-emails-bulk-tag", {
        method: "PUT",
        body: JSON.stringify({ authorized_email_ids: selectedEmailIds, tag_id: null }),
      });
      setAuthorizedEmails((prev) =>
        prev.map((e) => selectedEmailIds.includes(e.id) ? { ...e, tag_id: null, selected: false } : e)
      );
      toast.success(`Etiqueta quitada de ${selectedEmailIds.length} correo(s)`);
    } catch {
      toast.error("Error quitando etiquetas");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await apiFetch("/api/admin/email-tags", {
        method: "POST",
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      setEmailTags((prev) => [...prev, tag]);
      setNewTagName("");
      toast.success("Etiqueta creada");
    } catch {
      toast.error("Error creando etiqueta");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await apiFetch(`/api/admin/email-tags/${tagId}`, { method: "DELETE" });
      setEmailTags((prev) => prev.filter((t) => t.id !== tagId));
      setAuthorizedEmails((prev) => prev.map((e) => e.tag_id === tagId ? { ...e, tag_id: null } : e));
      toast.success("Etiqueta eliminada");
    } catch {
      toast.error("Error eliminando etiqueta");
    }
  };

  const handleAssignTagToSelected = async (tagId: number | null) => {
    if (selectedEmailIds.length === 0) return;
    try {
      await apiFetch("/api/admin/authorized-emails-bulk-tag", {
        method: "PUT",
        body: JSON.stringify({ authorized_email_ids: selectedEmailIds, tag_id: tagId }),
      });
      setAuthorizedEmails((prev) =>
        prev.map((e) => selectedEmailIds.includes(e.id) ? { ...e, tag_id: tagId, selected: false } : e)
      );
      toast.success(`Etiqueta asignada a ${selectedEmailIds.length} correo(s)`);
    } catch {
      toast.error("Error asignando etiqueta");
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

  // ── Alquiler rápido ──────────────────────────────────────────────────────────
  const openModalAlquilerRapido = () => {
    setFormAlquilerRapido({
      plataforma: "",
      fecha_inicio: new Date().toISOString().split("T")[0],
      dias: "30",
      precio: "",
      divisa: "COP",
      notas: "",
      password: "",
    });
    setNuevaPlataformaRapida("");
    setShowNuevaPlataformaRapida(false);
    setModalType("crearAlquiler");
    setShowModal(true);
  };

  const handleAgregarPlataformaRapida = async () => {
    if (!nuevaPlataformaRapida.trim()) return;
    try {
      await apiFetch("/api/alquileres/plataformas", {
        method: "POST",
        body: JSON.stringify({ nombre: nuevaPlataformaRapida.trim() }),
      });
      toast.success(`Plataforma "${nuevaPlataformaRapida.trim()}" agregada`);
      setFormAlquilerRapido({ ...formAlquilerRapido, plataforma: nuevaPlataformaRapida.trim() });
      setNuevaPlataformaRapida("");
      setShowNuevaPlataformaRapida(false);
      await loadPlataformas();
    } catch (err: any) {
      toast.error(err.message || "Error agregando plataforma");
    }
  };

  const handleCrearAlquilerRapido = async () => {
    if (!selectedUser) { toast.error("Selecciona un cliente primero"); return; }
    if (!formAlquilerRapido.plataforma) { toast.error("Selecciona una plataforma"); return; }
    if (!formAlquilerRapido.fecha_inicio) { toast.error("Indica la fecha de inicio"); return; }
    if (!formAlquilerRapido.dias || parseInt(formAlquilerRapido.dias) < 1) { toast.error("Días inválidos"); return; }
    if (selectedEmailIds.length === 0) { toast.error("Selecciona al menos un correo"); return; }

    const fecha_fin = addDays(formAlquilerRapido.fecha_inicio, parseInt(formAlquilerRapido.dias));
    const correosSeleccionados = selectedEmailAddresses;

    try {
      // Siempre bulk — una sola notificación Telegram
      await apiFetch("/api/alquileres/bulk", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          plataforma: formAlquilerRapido.plataforma,
          correos: correosSeleccionados.map(correo => ({
            correo,
            password: formAlquilerRapido.password || null,
          })),
          fecha_inicio: formAlquilerRapido.fecha_inicio,
          fecha_fin,
          precio: parseFloat(formAlquilerRapido.precio) || 0,
          divisa: formAlquilerRapido.divisa || "COP",
          notas: formAlquilerRapido.notas || null,
        }),
      });
      const total = correosSeleccionados.length;
      toast.success(
        total > 1
          ? `✅ ${total} alquileres creados para ${selectedUser.first_name}`
          : `✅ Alquiler creado para ${selectedUser.first_name}`
      );
      setShowModal(false);
      setAuthorizedEmails((prev) => prev.map((e) => ({ ...e, selected: false })));
    } catch (err: any) {
      toast.error(err.message || "Error creando alquiler");
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
      setShowModal(false);
    } catch {
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
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {selectedEmailIds.length > 0 && (
                  <>
                    {/* ── Botón Crear alquiler rápido ── */}
                    <button
                      className="btn-create-rental"
                      onClick={openModalAlquilerRapido}
                      title={`Crear alquiler con ${selectedEmailIds.length} correo(s) seleccionado(s)`}
                      style={{
                        background: "linear-gradient(135deg, #6c63ff, #4f46e5)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        boxShadow: "0 2px 8px rgba(108,99,255,0.35)",
                        transition: "opacity 0.15s",
                      }}
                    >
                      🎬 Crear alquiler ({selectedEmailIds.length})
                    </button>

                    <button className="btn-danger-small" onClick={() => { setModalType("deleteSelected"); setShowModal(true); }}>
                      🗑 Eliminar {selectedEmailIds.length} seleccionado(s)
                    </button>
                    <button className="btn-danger-small" onClick={() => { setModalType("clearSubjects" as any); setShowModal(true); }}>
                      🧹 Quitar asuntos de {selectedEmailIds.length} seleccionado(s)
                    </button>
                    {authorizedEmails.filter(e => selectedEmailIds.includes(e.id) && e.tag_id).length > 0 && (
                      <button className="btn-danger-small" onClick={handleRemoveTagFromSelected}>
                        🏷️ Quitar etiqueta de {selectedEmailIds.length} seleccionado(s)
                      </button>
                    )}
                  </>
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

              {/* Filtro por etiquetas */}
              {emailTags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px", padding: "4px 0" }}>
                  <button onClick={() => setActiveTagFilter(null)}
                    style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: activeTagFilter === null ? "rgba(255,255,255,0.2)" : "transparent", color: "white", cursor: "pointer" }}>
                    Todos
                  </button>
                  <button onClick={() => setActiveTagFilter(activeTagFilter === -1 ? null : -1)}
                    style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: activeTagFilter === -1 ? "rgba(255,255,255,0.2)" : "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
                    Sin etiqueta
                  </button>
                  {emailTags.map((tag) => (
                    <button key={tag.id} onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
                      style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, border: `1px solid ${tag.color}`, background: activeTagFilter === tag.id ? tag.color : "transparent", color: activeTagFilter === tag.id ? "white" : tag.color, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tag.color, display: "inline-block", flexShrink: 0 }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="authorized-emails-wrapper">
                {filteredEmails.map((e) => {
                  const tag = emailTags.find((t) => t.id === e.tag_id);
                  return (
                    <div key={e.id} className={`email-row ${selectedEmail?.id === e.id ? "active" : ""}`}>
                      {selectedUser && (
                        <input type="checkbox" checked={!!e.selected} onChange={() => toggleSelectEmail(e.id)} className="email-checkbox" />
                      )}
                      {tag && (
                        <span
                          style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "1px 6px", borderRadius: 8, background: tag.color + "33", border: `1px solid ${tag.color}`, color: tag.color, fontSize: "0.65rem", flexShrink: 0, cursor: "pointer", marginRight: 4 }}
                          title="Clic para quitar etiqueta"
                          onClick={() => handleRemoveTag(e.id)}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: tag.color, display: "inline-block" }} />
                          {tag.name}
                        </span>
                      )}
                      <span className="email-row-text" onClick={() => handleSelectEmail(e)}>{e.email}</span>
                      <div className="chip-actions">
                        <div className="chip-btn edit" onClick={() => openEditModal("email", e)}>✎</div>
                        <div className="chip-btn delete" onClick={() => openDeleteModal("email", e)}>✕</div>
                      </div>
                    </div>
                  );
                })}
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
            {/* Agregar correo individual */}
            <form onSubmit={handleCreateEmail} className="crud-form">
              <input placeholder={t("users.newAuthorizedEmail")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <button type="submit">{t("users.addEmail")}</button>
            </form>

            {/* Agregar lista */}
            <div className="crud-form">
              <button type="button" onClick={() => setShowBulkEmailList(!showBulkEmailList)}>
                {showBulkEmailList ? "▲ Ocultar lista" : "📋 Agregar lista"}
              </button>
              {showBulkEmailList && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  <textarea
                    placeholder={"Un correo por línea (contraseña opcional):\ncorreo1@gmail.com\tclave123\ncorreo2@gmail.com"}
                    value={bulkEmailList}
                    onChange={(e) => setBulkEmailList(e.target.value)}
                    rows={5}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)", resize: "vertical" }}
                  />
                  <button type="button" onClick={handleBulkEmailList}>Agregar correos</button>
                </div>
              )}
            </div>

            {/* Subir TXT */}
            <div className="bulk-upload">
              <input ref={fileInputRef} type="file" accept=".txt" onChange={(e) => setEmailFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={handleBulkEmails}>{t("users.uploadTxt")}</button>
            </div>

            {/* Gestionar etiquetas */}
            <div className="crud-form">
              <button type="button" onClick={() => setShowTagManager(!showTagManager)}>
                🏷️ {showTagManager ? "Ocultar etiquetas" : "Gestionar etiquetas"}
              </button>
              {showTagManager && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {emailTags.map((t) => (
                      <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 12, background: t.color, color: "white", fontSize: "0.8rem" }}>
                        {t.name}
                        <span style={{ cursor: "pointer" }} onClick={() => handleDeleteTag(t.id)}>✕</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input placeholder="Nueva etiqueta..." value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                      style={{ flex: 1, padding: "6px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }} />
                    <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)}
                      style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                    <button type="button" onClick={handleCreateTag}>Crear</button>
                  </div>
                </div>
              )}
            </div>

            {/* Etiquetar seleccionados */}
            {selectedEmailIds.length > 0 && (
              <div className="crud-form">
                <select onChange={(e) => handleAssignTagToSelected(e.target.value ? Number(e.target.value) : null)}
                  style={{ padding: "8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="">🏷️ Etiquetar {selectedEmailIds.length} correo(s)...</option>
                  <option value="">Sin etiqueta</option>
                  {emailTags.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Contraseña */}
            <form onSubmit={handleResetPassword} className="crud-form">
              <input type="password" placeholder={t("users.newPassword")} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
              <button type="submit">{t("users.updatePassword")}</button>
            </form>

            {/* Asignar asunto masivo */}
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
                  Se eliminarán {selectedEmailIds.length} correo(s) de {selectedUser?.first_name}. Esta acción no se puede deshacer.
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
            {(modalType as any) === "clearSubjects" && (
              <>
                <h3>¿Quitar todos los asuntos?</h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                  Se eliminarán todos los asuntos de {selectedEmailIds.length} correo(s) seleccionado(s). Esta acción no se puede deshacer.
                </p>
                <button onClick={handleClearSubjectsFromSelected}>Quitar asuntos</button>
                <button onClick={() => setShowModal(false)}>Cancelar</button>
              </>
            )}

            {/* ── MODAL CREAR ALQUILER RÁPIDO ─────────────────────────────── */}
            {modalType === "crearAlquiler" && selectedUser && (
              <>
                <h3>🎬 Crear alquiler</h3>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", margin: "0 0 12px" }}>
                  Cliente: <strong style={{ color: "#a5b4fc" }}>{selectedUser.first_name}</strong>
                  {" · "}
                  {selectedEmailIds.length} correo{selectedEmailIds.length > 1 ? "s" : ""} seleccionado{selectedEmailIds.length > 1 ? "s" : ""}
                </p>

                {/* Vista previa de correos que se van a asignar */}
                <div style={{
                  background: "rgba(108,99,255,0.1)",
                  border: "1px solid rgba(108,99,255,0.3)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 14,
                  maxHeight: 120,
                  overflowY: "auto",
                }}>
                  {selectedEmailAddresses.map((c) => (
                    <div key={c} style={{ fontSize: "0.78rem", color: "#c4b5fd", padding: "2px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#6c63ff" }}>📧</span> {c}
                    </div>
                  ))}
                </div>

                {/* Plataforma */}
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Plataforma *
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {plataformas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormAlquilerRapido({ ...formAlquilerRapido, plataforma: p.nombre });
                        setShowNuevaPlataformaRapida(false);
                      }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 20,
                        border: `1px solid ${formAlquilerRapido.plataforma === p.nombre ? "#6c63ff" : "rgba(255,255,255,0.15)"}`,
                        background: formAlquilerRapido.plataforma === p.nombre ? "rgba(108,99,255,0.3)" : "transparent",
                        color: formAlquilerRapido.plataforma === p.nombre ? "#a5b4fc" : "rgba(255,255,255,0.6)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {p.nombre}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowNuevaPlataformaRapida(!showNuevaPlataformaRapida)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      border: "1px dashed rgba(255,255,255,0.2)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    ➕ Nueva
                  </button>
                </div>

                {showNuevaPlataformaRapida && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Nombre de la plataforma"
                      value={nuevaPlataformaRapida}
                      onChange={(e) => setNuevaPlataformaRapida(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataformaRapida()}
                      autoFocus
                      style={{
                        flex: 1, padding: "6px 10px", borderRadius: 6,
                        background: "rgba(255,255,255,0.06)", color: "white",
                        border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.82rem",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAgregarPlataformaRapida}
                      style={{
                        padding: "6px 14px", borderRadius: 6, border: "none",
                        background: "#4f46e5", color: "white", cursor: "pointer", fontSize: "0.82rem",
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                )}

                {formAlquilerRapido.plataforma && (
                  <p style={{ fontSize: "0.75rem", color: "#a5b4fc", marginBottom: 10 }}>
                    ✅ Plataforma: <strong>{formAlquilerRapido.plataforma}</strong>
                  </p>
                )}

                {/* Fecha inicio */}
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Fecha inicio *
                </label>
                <input
                  type="date"
                  value={formAlquilerRapido.fecha_inicio}
                  onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, fecha_inicio: e.target.value })}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, marginBottom: 10,
                    background: "rgba(255,255,255,0.06)", color: "white",
                    border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                />

                {/* Días */}
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Días asignados *
                </label>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormAlquilerRapido({ ...formAlquilerRapido, dias: String(d) })}
                      style={{
                        flex: 1, padding: "6px 0", borderRadius: 6,
                        border: `1px solid ${formAlquilerRapido.dias === String(d) ? "#6c63ff" : "rgba(255,255,255,0.15)"}`,
                        background: formAlquilerRapido.dias === String(d) ? "rgba(108,99,255,0.3)" : "transparent",
                        color: formAlquilerRapido.dias === String(d) ? "#a5b4fc" : "rgba(255,255,255,0.6)",
                        fontSize: "0.82rem", cursor: "pointer",
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="O escribe los días manualmente"
                  value={formAlquilerRapido.dias}
                  onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, dias: e.target.value })}
                  min="1"
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, marginBottom: 6,
                    background: "rgba(255,255,255,0.06)", color: "white",
                    border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                />

                {formAlquilerRapido.fecha_inicio && formAlquilerRapido.dias && parseInt(formAlquilerRapido.dias) > 0 && (
                  <p style={{ fontSize: "0.75rem", color: "#a5b4fc", marginBottom: 10 }}>
                    📅 Vence: <strong>{formatDate(addDays(formAlquilerRapido.fecha_inicio, parseInt(formAlquilerRapido.dias)))}</strong>
                    {" · "}{formAlquilerRapido.dias} días
                  </p>
                )}

                {/* Precio y divisa */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    type="number"
                    placeholder="Precio por cuenta"
                    value={formAlquilerRapido.precio}
                    onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, precio: e.target.value })}
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.06)", color: "white",
                      border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                    }}
                  />
                  <select
                    value={formAlquilerRapido.divisa}
                    onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, divisa: e.target.value })}
                    style={{
                      padding: "8px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.06)", color: "white",
                      border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                    }}
                  >
                    <option value="COP">COP</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                {/* Contraseña común */}
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Contraseña (opcional — misma para todos los correos)
                </label>
                <input
                  type="text"
                  placeholder="Ej: NexaVolt8841#"
                  value={formAlquilerRapido.password}
                  onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, password: e.target.value })}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, marginBottom: 10,
                    background: "rgba(255,255,255,0.06)", color: "white",
                    border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                    boxSizing: "border-box", fontFamily: "monospace",
                  }}
                />

                {/* Notas */}
                <textarea
                  placeholder="Notas (opcional)"
                  value={formAlquilerRapido.notas}
                  onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, notas: e.target.value })}
                  rows={2}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, marginBottom: 16,
                    background: "rgba(255,255,255,0.06)", color: "white",
                    border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.82rem",
                    resize: "none", boxSizing: "border-box",
                  }}
                />

                <div className="modal-actions" style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCrearAlquilerRapido}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #6c63ff, #4f46e5)",
                      color: "white", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >
                    {selectedEmailIds.length > 1
                      ? `Crear ${selectedEmailIds.length} alquileres`
                      : "Crear alquiler"}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "10px 18px", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "transparent", color: "rgba(255,255,255,0.6)",
                      fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
