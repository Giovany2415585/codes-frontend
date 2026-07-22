import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import "./Users.css";
import { useTranslation } from "react-i18next";
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
  categoria?: string | null;
}

interface DangerousSubject {
  id: number;
  name: string;
}

interface Plataforma {
  id: number;
  nombre: string;
}

interface InventarioCuenta {
  id: number;
  correo: string;
  password: string;
  plataforma: string;
  proveedor?: string;
  estado: string;
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
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [editingSubject, setEditingSubject] = useState<SavedSubject | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectCat, setEditSubjectCat] = useState("");
  const [showDangerousSubjects, setShowDangerousSubjects] = useState(false);
  const [newDangerousSubject, setNewDangerousSubject] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<AuthorizedEmail | null>(null);
  const [emailSearch, setEmailSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"users" | "emails" | "subjects">("users");
  const [newUser, setNewUser] = useState({ first_name: "", email: "", phone: "", password: "" });
  const [newUserPhoneCode, setNewUserPhoneCode] = useState("+57");
  const [newUserPhoneNumber, setNewUserPhoneNumber] = useState("");
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
  const [editUserForm, setEditUserForm] = useState({ first_name: "", email: "", phone: "", newPassword: "" });
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [bulkEmailList, setBulkEmailList] = useState("");
  const [showBulkEmailList, setShowBulkEmailList] = useState(false);
  const [emailTags, setEmailTags] = useState<EmailTag[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [showTagManager, setShowTagManager] = useState(false);
  const [asignandoAsunto, setAsignandoAsunto] = useState(false);

  // ── Estado para alquiler rápido ─────────────────────────────────────────────
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [formAlquilerRapido, setFormAlquilerRapido] = useState({
    plataforma: "",
    fecha_inicio: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(),
    dias: "30",
    precio: "",
    divisa: "COP",
    notas: "",
    password: "",
  });
  const [passwordsIndividuales, setPasswordsIndividuales] = useState<Record<string, string>>({});
  const [nuevaPlataformaRapida, setNuevaPlataformaRapida] = useState("");
  const [showNuevaPlataformaRapida, setShowNuevaPlataformaRapida] = useState(false);
  const [showPlataformasRapido, setShowPlataformasRapido] = useState(false);
  const [bulkPasswordMode, setBulkPasswordMode] = useState(false);
  const [bulkPasswordText, setBulkPasswordText] = useState("");

  // ── Estado para uso de Inventario en alquiler rápido ────────────────────────
  const [usarInventario, setUsarInventario] = useState(false);
  const [cuentasInventario, setCuentasInventario] = useState<InventarioCuenta[]>([]);
  const [inventarioSeleccionado, setInventarioSeleccionado] = useState<Record<string, number | "">>({});
  const [asuntosPreview, setAsuntosPreview] = useState<SavedSubject[]>([]);
  const [loadingInventario, setLoadingInventario] = useState(false);
  // Selección múltiple de cuentas del inventario cuando NO hay correos preseleccionados
  const [inventarioIdsElegidos, setInventarioIdsElegidos] = useState<Set<number>>(new Set());

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
  const allSelected = filteredEmails.length > 0 && filteredEmails.every((e) => e.selected);

  const toggleSelectEmail = (id: number) => {
    setAuthorizedEmails((prev) => prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)));
  };

  const toggleSelectAll = () => {
    const filteredIds = new Set(filteredEmails.map((e) => e.id));
    setAuthorizedEmails((prev) => prev.map((e) =>
      filteredIds.has(e.id) ? { ...e, selected: !allSelected } : e
    ));
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
    if (asignandoAsunto) return;
    setAsignandoAsunto(true);
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
    } finally {
      setAsignandoAsunto(false);
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
    // Validación simple: solo dígitos si hay número
    if (newUserPhoneNumber && !/^\d{6,}$/.test(newUserPhoneNumber)) { toast.error(t("users.invalidPhone")); return; }
    const phone = newUserPhoneNumber ? `${newUserPhoneCode}${newUserPhoneNumber}` : "";
    try {
      await apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify({ ...newUser, phone }) });
      toast.success(t("users.userCreated"));
      setNewUser({ first_name: "", email: "", phone: "", password: "" });
      setNewUserPhoneNumber("");
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
  const openModalAlquilerRapido = async () => {
    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
    setFormAlquilerRapido({
      plataforma: "",
      fecha_inicio: today,
      dias: "30",
      precio: "",
      divisa: "COP",
      notas: "",
      password: "",
    });
    // Precargar contraseñas desde alquileres activos
    try {
      if (selectedUser) {
        const alquileres = await apiFetch(`/api/alquileres?user_id=${selectedUser.id}`);
        const pwMap: Record<string, string> = {};
        for (const a of alquileres) {
          if (a.correo && a.password) pwMap[a.correo] = a.password;
        }
        setPasswordsIndividuales(pwMap);
      } else {
        setPasswordsIndividuales({});
      }
    } catch {
      setPasswordsIndividuales({});
    }
    setNuevaPlataformaRapida("");
    setShowNuevaPlataformaRapida(false);
    setShowPlataformasRapido(false);
    setBulkPasswordMode(false);
    setBulkPasswordText("");
    setUsarInventario(false);
    setCuentasInventario([]);
    setInventarioSeleccionado({});
    setInventarioIdsElegidos(new Set());
    setAsuntosPreview([]);
    setModalType("crearAlquiler");
    setShowModal(true);
  };

  // Cargar cuentas de inventario + asuntos previstos cuando cambia la plataforma (con inventario activo)
  const loadInventarioYAsuntos = async (plataforma: string) => {
    if (!plataforma) {
      setCuentasInventario([]);
      setAsuntosPreview([]);
      return;
    }
    setLoadingInventario(true);
    try {
      const [cuentas, asuntos] = await Promise.all([
        apiFetch(`/api/admin/inventario/disponibles/${encodeURIComponent(plataforma)}`),
        apiFetch(`/api/alquileres/asuntos-por-plataforma/${encodeURIComponent(plataforma)}`),
      ]);
      setCuentasInventario(cuentas);
      setAsuntosPreview(asuntos);
    } catch {
      setCuentasInventario([]);
      setAsuntosPreview([]);
      toast.error("Error cargando inventario/asuntos");
    } finally {
      setLoadingInventario(false);
    }
  };

  const handleToggleUsarInventario = async () => {
    const next = !usarInventario;
    setUsarInventario(next);
    setInventarioSeleccionado({});
    setInventarioIdsElegidos(new Set());
    if (next && formAlquilerRapido.plataforma) {
      await loadInventarioYAsuntos(formAlquilerRapido.plataforma);
    } else {
      setCuentasInventario([]);
      setAsuntosPreview([]);
    }
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

    const fecha_fin = addDays(formAlquilerRapido.fecha_inicio, parseInt(formAlquilerRapido.dias));

    // ── Caso B: sin correos preseleccionados, usando inventario (selección múltiple) ──
    if (selectedEmailAddresses.length === 0) {
      if (!usarInventario) {
        toast.error("Selecciona al menos un correo, o activa 'Usar cuenta del inventario'");
        return;
      }
      if (inventarioIdsElegidos.size === 0) {
        toast.error("Selecciona al menos una cuenta del inventario");
        return;
      }

      try {
        await apiFetch("/api/alquileres/bulk", {
          method: "POST",
          body: JSON.stringify({
            user_id: selectedUser.id,
            plataforma: formAlquilerRapido.plataforma,
            correos: Array.from(inventarioIdsElegidos).map((inventario_id) => ({ inventario_id })),
            fecha_inicio: formAlquilerRapido.fecha_inicio,
            fecha_fin,
            precio: parseFloat(formAlquilerRapido.precio) || 0,
            divisa: formAlquilerRapido.divisa || "COP",
            notas: formAlquilerRapido.notas || null,
          }),
        });
        const total = inventarioIdsElegidos.size;
        toast.success(
          total > 1
            ? `✅ ${total} alquileres creados para ${selectedUser.first_name}`
            : `✅ Alquiler creado para ${selectedUser.first_name}`
        );
        setShowModal(false);
        if (selectedUser) handleSelectUser(selectedUser); // recargar correos del cliente
      } catch (err: any) {
        toast.error(err.message || "Error creando alquiler");
      }
      return;
    }

    // ── Caso A: con correos preseleccionados ──
    if (selectedEmailIds.length === 0) { toast.error("Selecciona al menos un correo"); return; }

    // Si está usando inventario, validar que todos los correos tengan cuenta asignada
    if (usarInventario) {
      const faltantes = selectedEmailAddresses.filter((c) => !inventarioSeleccionado[c]);
      if (faltantes.length > 0) {
        toast.error(`Asigna una cuenta del inventario a: ${faltantes.join(", ")}`);
        return;
      }
    }

    const correosSeleccionados = selectedEmailAddresses;

    try {
      // Siempre bulk — una sola notificación Telegram
      await apiFetch("/api/alquileres/bulk", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          plataforma: formAlquilerRapido.plataforma,
          correos: correosSeleccionados.map(correo => {
            if (usarInventario) {
              return { inventario_id: inventarioSeleccionado[correo] };
            }
            return {
              correo,
              // Contraseña individual si existe, si no la común
              password: passwordsIndividuales[correo] || formAlquilerRapido.password || null,
            };
          }),
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
    if (entity === "user") {
      setEditUserForm({
        first_name: data.first_name || "",
        email: data.email || "",
        phone: data.phone || "",
        newPassword: "",
      });
    }
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
              first_name: editUserForm.first_name,
              email: editUserForm.email,
              phone: editUserForm.phone,
              role: modalData.role,
            }),
          });
          // Si se ingresó nueva contraseña, actualizarla por separado
          if (editUserForm.newPassword && editUserForm.newPassword.length >= 6) {
            await apiFetch(`/api/admin/users/${modalData.id}/reset-password`, {
              method: "PUT",
              body: JSON.stringify({ newPassword: editUserForm.newPassword }),
            });
          }
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
                {/* ── Botón Crear alquiler rápido — visible con cliente seleccionado ── */}
                {selectedUser && (
                  <button
                    className="btn-create-rental"
                    onClick={openModalAlquilerRapido}
                    title={
                      selectedEmailIds.length > 0
                        ? `Crear alquiler con ${selectedEmailIds.length} correo(s) seleccionado(s)`
                        : "Crear alquiler para este cliente"
                    }
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
                    🎬 Crear alquiler{selectedEmailIds.length > 0 ? ` (${selectedEmailIds.length})` : ""}
                  </button>
                )}

                {selectedEmailIds.length > 0 && (
                  <>
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
                {(() => {
                  // Agrupar por categoría
                  const grupos: Record<string, SavedSubject[]> = {};
                  savedSubjects.forEach(s => {
                    const cat = s.categoria || "Sin categoría";
                    if (!grupos[cat]) grupos[cat] = [];
                    grupos[cat].push(s);
                  });
                  // Ordenar: Sin categoría al final
                  const cats = Object.keys(grupos).sort((a, b) => {
                    if (a === "Sin categoría") return 1;
                    if (b === "Sin categoría") return -1;
                    return a.localeCompare(b);
                  });
                  return cats.map(cat => (
                    <div key={cat} style={{ marginBottom: 8 }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}
                        onClick={() => setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                      >
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", flex: 1 }}>{cat}</span>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{collapsedCats[cat] ? "▶" : "▼"}</span>
                      </div>
                      {!collapsedCats[cat] && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 6 }}>
                          {grupos[cat].map(s => (
                            editingSubject?.id === s.id ? (
                              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 4, background: "rgba(99,102,241,0.1)", borderRadius: 6, padding: 6 }}>
                                <input
                                  value={editSubjectName}
                                  onChange={e => setEditSubjectName(e.target.value)}
                                  style={{ fontSize: "0.75rem", padding: "3px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
                                />
                                <select
                                  value={editSubjectCat}
                                  onChange={e => setEditSubjectCat(e.target.value)}
                                  style={{ fontSize: "0.75rem", padding: "3px 6px", borderRadius: 4, background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
                                >
                                  <option value="">Sin categoría</option>
                                  {plataformas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                                </select>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button onClick={async () => {
                                    await apiFetch(`/api/admin/saved-subjects/${s.id}`, { method: "PUT", body: JSON.stringify({ name: editSubjectName, categoria: editSubjectCat || null }) });
                                    setEditingSubject(null);
                                    loadSavedSubjects();
                                    toast.success("Asunto actualizado");
                                  }} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 4, background: "#6366f1", border: "none", color: "white", cursor: "pointer" }}>Guardar</button>
                                  <button onClick={() => setEditingSubject(null)} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer" }}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <div key={s.id} className="saved-subject-chip">
                                <span onClick={() => {
                                  if (selectedEmail) setNewSubject(s.name);
                                  else setBulkSubjectName(s.name);
                                  toast.success("Asunto copiado");
                                }}>{s.name}</span>
                                <div style={{ display: "flex", gap: 2 }}>
                                  <div className="chip-btn edit" onClick={() => { setEditingSubject(s); setEditSubjectName(s.name); setEditSubjectCat(s.categoria || ""); }}>✎</div>
                                  <div className="chip-btn delete" onClick={() => handleDeleteSavedSubject(s.id)}>✕</div>
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
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
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={newUserPhoneCode}
                onChange={(e) => setNewUserPhoneCode(e.target.value)}
                style={{ width: 90, flexShrink: 0, padding: "9px 6px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9", fontSize: "0.875rem" }}
              >
                <option value="+57">🇨🇴 +57</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+51">🇵🇪 +51</option>
                <option value="+58">🇻🇪 +58</option>
                <option value="+593">🇪🇨 +593</option>
                <option value="+507">🇵🇦 +507</option>
                <option value="+506">🇨🇷 +506</option>
                <option value="+502">🇬🇹 +502</option>
                <option value="+503">🇸🇻 +503</option>
                <option value="+504">🇭🇳 +504</option>
                <option value="+505">🇳🇮 +505</option>
                <option value="+591">🇧🇴 +591</option>
                <option value="+595">🇵🇾 +595</option>
                <option value="+598">🇺🇾 +598</option>
                <option value="+54">🇦🇷 +54</option>
                <option value="+56">🇨🇱 +56</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+1809">🇩🇴 +1809</option>
              </select>
              <input
                type="tel"
                placeholder={t("users.phone")}
                value={newUserPhoneNumber}
                onChange={(e) => setNewUserPhoneNumber(e.target.value.replace(/\D/g, ""))}
                style={{ flex: 1 }}
              />
            </div>
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
                <input placeholder="Escribe el asunto..." value={bulkSubjectName} onChange={(e) => setBulkSubjectName(e.target.value)} disabled={asignandoAsunto} />
                <button type="submit" disabled={asignandoAsunto}>{asignandoAsunto ? "Asignando..." : "Asignar a todos"}</button>
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
            {modalType === "edit" && modalEntity === "user" && (
              <>
                <h3>{t("users.edit")}</h3>
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Nombre
                </label>
                <input
                  value={editUserForm.first_name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, first_name: e.target.value })}
                  placeholder="Nombre completo"
                />
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4, marginTop: 8 }}>
                  Teléfono
                </label>
                <input
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  placeholder="+57 300 1234567"
                />
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4, marginTop: 8 }}>
                  Correo
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  placeholder="correo@gmail.com"
                />
                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4, marginTop: 8 }}>
                  Nueva contraseña (opcional)
                </label>
                <input
                  type="text"
                  value={editUserForm.newPassword}
                  onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                  placeholder="Dejar vacío para no cambiar"
                  style={{ fontFamily: "monospace" }}
                />
                {editUserForm.newPassword && editUserForm.newPassword.length > 0 && editUserForm.newPassword.length < 6 && (
                  <p style={{ color: "#fbbf24", fontSize: "0.75rem", margin: "4px 0 0" }}>
                    ⚠️ Mínimo 6 caracteres — no se actualizará si es más corta
                  </p>
                )}
                {editUserForm.newPassword && editUserForm.newPassword.length >= 6 && (
                  <p style={{ color: "#a5b4fc", fontSize: "0.75rem", margin: "4px 0 0" }}>
                    🔐 Se notificará al cliente por Telegram
                  </p>
                )}
                <div className="modal-actions" style={{ marginTop: 12 }}>
                  <button className="btn-primary" onClick={handleConfirm}>Actualizar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}
            {modalType === "edit" && modalEntity !== "user" && (
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
              <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: 4 }}>
                <h3>🎬 Crear alquiler</h3>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", margin: "0 0 12px" }}>
                  Cliente: <strong style={{ color: "#a5b4fc" }}>{selectedUser.first_name}</strong>
                  {selectedEmailIds.length > 0 && (
                    <>
                      {" · "}
                      {selectedEmailIds.length} correo{selectedEmailIds.length > 1 ? "s" : ""} seleccionado{selectedEmailIds.length > 1 ? "s" : ""}
                    </>
                  )}
                </p>

                {/* ── TOGGLE USAR INVENTARIO ── */}
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                    background: usarInventario ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${usarInventario ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                  }}
                >
                  <label style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: usarInventario ? "#4ade80" : "rgba(255,255,255,0.7)", margin: 0, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={usarInventario} onChange={handleToggleUsarInventario} style={{ width: 16, height: 16, flexShrink: 0, margin: 0 }} />
                    <span>📦 Usar cuenta del inventario</span>
                  </label>
                  {usarInventario && (
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                      {cuentasInventario.length} disponible{cuentasInventario.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Correos seleccionados con contraseña / inventario */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                    {usarInventario
                      ? "Cuentas del inventario a asignar"
                      : `Correos seleccionados (${selectedEmailAddresses.length})`}
                  </label>
                  {!usarInventario && selectedEmailAddresses.length > 0 && (
                    <button type="button"
                      onClick={() => {
                        setBulkPasswordMode(prev => !prev);
                        setBulkPasswordText("");
                      }}
                      style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.15)", background: bulkPasswordMode ? "rgba(99,102,241,0.3)" : "transparent",
                        color: bulkPasswordMode ? "#a5b4fc" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                      📋 {bulkPasswordMode ? "Modo individual" : "Pegar lista de claves"}
                    </button>
                  )}
                </div>

                {usarInventario ? (
                  /* ── Modo inventario ── */
                  selectedEmailAddresses.length > 0 ? (
                    /* Hay correos preseleccionados: dropdown por correo (1 cuenta inventario por correo) */
                    <div style={{
                      background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)",
                      borderRadius: 10, padding: "8px 10px", marginBottom: 14,
                      maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6,
                    }}>
                      {!formAlquilerRapido.plataforma && (
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                          Selecciona una plataforma para ver las cuentas disponibles.
                        </p>
                      )}
                      {formAlquilerRapido.plataforma && loadingInventario && (
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>Cargando cuentas...</p>
                      )}
                      {formAlquilerRapido.plataforma && !loadingInventario && cuentasInventario.length === 0 && (
                        <p style={{ fontSize: "0.78rem", color: "#fbbf24", margin: 0 }}>
                          ⚠️ No hay cuentas disponibles de {formAlquilerRapido.plataforma} en el inventario.
                        </p>
                      )}
                      {formAlquilerRapido.plataforma && !loadingInventario && cuentasInventario.length > 0 && selectedEmailAddresses.map((c) => (
                        <div key={c} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "0.78rem", color: "#a5b4fc", minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            📧 {c}
                          </span>
                          <select
                            value={inventarioSeleccionado[c] || ""}
                            onChange={(e) => setInventarioSeleccionado(prev => ({ ...prev, [c]: e.target.value ? Number(e.target.value) : "" }))}
                            style={{
                              width: 200, padding: "4px 8px", borderRadius: 6, flexShrink: 0,
                              background: "rgba(255,255,255,0.06)", color: "white",
                              border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem",
                            }}
                          >
                            <option value="">Selecciona cuenta...</option>
                            {cuentasInventario
                              .filter((cuenta) => {
                                const asignadaAOtro = Object.entries(inventarioSeleccionado).some(
                                  ([otroCorreo, invId]) => otroCorreo !== c && invId === cuenta.id
                                );
                                return !asignadaAOtro;
                              })
                              .map((cuenta) => (
                                <option key={cuenta.id} value={cuenta.id}>
                                  {cuenta.correo} {cuenta.proveedor ? `(${cuenta.proveedor})` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Sin correos preseleccionados: selección múltiple de cuentas del inventario */
                    <div style={{
                      background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)",
                      borderRadius: 10, padding: "8px 10px", marginBottom: 14,
                      display: "flex", flexDirection: "column", gap: 4,
                    }}>
                      {!formAlquilerRapido.plataforma && (
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                          Selecciona una plataforma para ver las cuentas disponibles.
                        </p>
                      )}
                      {formAlquilerRapido.plataforma && loadingInventario && (
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>Cargando cuentas...</p>
                      )}
                      {formAlquilerRapido.plataforma && !loadingInventario && cuentasInventario.length === 0 && (
                        <p style={{ fontSize: "0.78rem", color: "#fbbf24", margin: 0 }}>
                          ⚠️ No hay cuentas disponibles de {formAlquilerRapido.plataforma} en el inventario.
                        </p>
                      )}
                      {formAlquilerRapido.plataforma && !loadingInventario && cuentasInventario.length > 0 && (
                        <>
                          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", margin: "0 0 4px" }}>
                            Marca una o varias cuentas. Por cada una se creará un alquiler y se agregará el correo automáticamente.
                          </p>
                          {cuentasInventario.map((cuenta) => (
                            <label key={cuenta.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "#a5b4fc", cursor: "pointer", padding: "4px 2px" }}>
                              <input
                                type="checkbox"
                                checked={inventarioIdsElegidos.has(cuenta.id)}
                                onChange={(e) => {
                                  setInventarioIdsElegidos(prev => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(cuenta.id);
                                    else next.delete(cuenta.id);
                                    return next;
                                  });
                                }}
                                style={{ width: 16, height: 16, flexShrink: 0, margin: 0 }}
                              />
                              <span>📧 {cuenta.correo} {cuenta.proveedor ? <span style={{ color: "rgba(255,255,255,0.4)" }}>({cuenta.proveedor})</span> : ""}</span>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  )
                ) : selectedEmailAddresses.length === 0 ? (
                  /* Sin inventario y sin correos seleccionados */
                  <div style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "12px", marginBottom: 14,
                  }}>
                    <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      No hay correos seleccionados. Marca uno o más correos autorizados de este cliente arriba,
                      o activa "📦 Usar cuenta del inventario" para asignar cuentas nuevas automáticamente.
                    </p>
                  </div>
                ) : bulkPasswordMode ? (
                  /* Modo lista bulk */
                  <div style={{ marginBottom: 14 }}>
                    <textarea
                      rows={selectedEmailAddresses.length}
                      placeholder="Una contraseña por línea, mismo orden que correos"
                      value={bulkPasswordText}
                      onChange={(e) => {
                        setBulkPasswordText(e.target.value);
                        // Mapear contraseñas a correos en orden
                        const claves = e.target.value.split("\n").map(l => l.trim());
                        const newPasswords: Record<string, string> = {};
                        selectedEmailAddresses.forEach((correo, i) => {
                          newPasswords[correo] = claves[i] || "";
                        });
                        setPasswordsIndividuales(newPasswords);
                      }}
                      style={{ width: "100%", fontFamily: "monospace", fontSize: "0.82rem",
                        background: "rgba(255,255,255,0.05)", color: "white",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                        padding: "8px 10px", boxSizing: "border-box", resize: "none" }}
                    />
                    {/* Advertencia si no coinciden */}
                    {(() => {
                      const claves = bulkPasswordText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
                      if (claves.length === 0) return null;
                      if (claves.length > selectedEmailAddresses.length) {
                        return <p style={{ color: "#f87171", fontSize: "0.75rem", margin: "4px 0 0" }}>
                          ⚠️ Hay {claves.length - selectedEmailAddresses.length} contraseña(s) de más
                        </p>;
                      }
                      if (claves.length < selectedEmailAddresses.length) {
                        return <p style={{ color: "#fbbf24", fontSize: "0.75rem", margin: "4px 0 0" }}>
                          ⚠️ Faltan {selectedEmailAddresses.length - claves.length} contraseña(s) — los correos sin clave quedarán sin contraseña
                        </p>;
                      }
                      return <p style={{ color: "#4ade80", fontSize: "0.75rem", margin: "4px 0 0" }}>
                        ✅ {claves.length} contraseñas listas
                      </p>;
                    })()}
                    {/* Preview correo → clave */}
                    <div style={{ marginTop: 8, background: "rgba(108,99,255,0.07)", border: "1px solid rgba(108,99,255,0.15)", borderRadius: 8, padding: "6px 10px", maxHeight: 150, overflowY: "auto" }}>
                      {selectedEmailAddresses.map((c, i) => {
                        const claves = bulkPasswordText.split("\n").map(l => l.trim());
                        const clave = claves[i] || "";
                        return (
                          <div key={c} style={{ display: "flex", gap: 8, fontSize: "0.75rem", padding: "2px 0" }}>
                            <span style={{ color: "#a5b4fc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📧 {c}</span>
                            <span style={{ color: clave ? "#4ade80" : "rgba(255,255,255,0.3)", fontFamily: "monospace", flexShrink: 0 }}>
                              {clave ? `🔑 ${clave}` : "sin clave"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Modo individual */
                  <div style={{
                    background: "rgba(108,99,255,0.07)", border: "1px solid rgba(108,99,255,0.2)",
                    borderRadius: 10, padding: "8px 10px", marginBottom: 14,
                    maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    {selectedEmailAddresses.map((c) => (
                      <div key={c} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.78rem", color: "#a5b4fc", minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📧 {c}
                        </span>
                        <input
                          type="text"
                          placeholder="🔑 contraseña"
                          value={passwordsIndividuales[c] || ""}
                          onChange={(e) => setPasswordsIndividuales(prev => ({ ...prev, [c]: e.target.value }))}
                          style={{
                            width: 130, padding: "4px 8px", borderRadius: 6, flexShrink: 0,
                            background: "rgba(255,255,255,0.06)", color: "white",
                            border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem",
                            fontFamily: "monospace",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview de asuntos que se asignarán (modo inventario) */}
                {usarInventario && formAlquilerRapido.plataforma && (
                  <div style={{ marginBottom: 14 }}>
                    {asuntosPreview.length > 0 ? (
                      <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", margin: "0 0 4px" }}>
                          📨 Asuntos que se asignarán automáticamente:
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {asuntosPreview.map((s) => (
                            <span key={s.id} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" }}>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : !loadingInventario && (
                      <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                        No hay asuntos guardados para "{formAlquilerRapido.plataforma}" — puedes asignarlos después manualmente.
                      </p>
                    )}
                  </div>
                )}

                {/* Plataforma colapsable */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                    Plataforma * {formAlquilerRapido.plataforma && <span style={{ color: "#a5b4fc", fontWeight: 700 }}>— {formAlquilerRapido.plataforma}</span>}
                  </label>
                  <button type="button" onClick={() => setShowPlataformasRapido(prev => !prev)}
                    style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                    {showPlataformasRapido ? "▲ Ocultar" : "▼ Ver"}
                  </button>
                </div>
                {showPlataformasRapido && (<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {plataformas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={async () => {
                        setFormAlquilerRapido({ ...formAlquilerRapido, plataforma: p.nombre });
                        setShowNuevaPlataformaRapida(false);
                        setInventarioSeleccionado({});
                        setInventarioIdsElegidos(new Set());
                        if (usarInventario) {
                          await loadInventarioYAsuntos(p.nombre);
                        }
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
                )}
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
                <div style={{ display: "flex", gap: 8, marginBottom: 10, width: "100%" }}>
                  <input
                    type="number"
                    placeholder="Precio por cuenta"
                    value={formAlquilerRapido.precio}
                    onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, precio: e.target.value })}
                    style={{
                      flex: "1 1 auto", width: "auto", minWidth: 0, padding: "8px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.06)", color: "white",
                      border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  />
                  <select
                    value={formAlquilerRapido.divisa}
                    onChange={(e) => setFormAlquilerRapido({ ...formAlquilerRapido, divisa: e.target.value })}
                    style={{
                      flex: "0 0 90px", width: "90px", padding: "8px 6px", borderRadius: 6,
                      background: "rgba(255,255,255,0.06)", color: "white",
                      border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="COP">COP</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

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
                    {(() => {
                      const total = selectedEmailIds.length > 0 ? selectedEmailIds.length : inventarioIdsElegidos.size;
                      return total > 1 ? `Crear ${total} alquileres` : "Crear alquiler";
                    })()}
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;