import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import "./Rentals.css";
import { apiFetch } from "../services/api";

interface Rental {
  id: number;
  user_id: number;
  cliente_nombre: string;
  cliente_email: string;
  plataforma: string;
  correo: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  precio: number;
  estado: "activo" | "vencido" | "cancelado";
  notas: string;
  dias_restantes: number;
  pago_estado: "pagado" | "pendiente" | "vencido" | null;
}

interface User {
  id: number;
  first_name: string;
  email: string;
}

interface Pago {
  id: number;
  alquiler_id: number;
  monto: number;
  fecha_pago: string;
  estado: string;
  metodo: string;
  notas: string;
}

interface Garantia {
  id: number;
  alquiler_id: number;
  fecha_reporte: string;
  descripcion: string;
  cuenta_reemplazo: string;
  estado: "pendiente" | "resuelta";
  notas: string;
}

const DEFAULT_PLATAFORMAS = ["Netflix","Disney+","Max","Paramount+","Prime Video","Crunchyroll","Apple TV+","Spotify","YouTube Premium"];

interface Plataforma {
  id: number;
  nombre: string;
}

interface MetodoPago {
  id: number;
  nombre: string;
}

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

function Rentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [nuevaPlataforma, setNuevaPlataforma] = useState("");
  const [showNuevaPlataforma, setShowNuevaPlataforma] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [nuevoMetodo, setNuevoMetodo] = useState("");
  const [showNuevoMetodo, setShowNuevoMetodo] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [activeTab, setActiveTab] = useState<"cuentas" | "pagos" | "garantias">("cuentas");
  const [gruposAbiertos, setGruposAbiertos] = useState<string[]>([]);
  const [gruposTablaAbiertos, setGruposTablaAbiertos] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<
    "crear" | "editar" | "renovar" | "pago" | "pagoMasivo" | "deleteMasivo" | "garantia" | "resolver" | "delete" | null
  >(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchText, setSearchText] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [selectedCuentas, setSelectedCuentas] = useState<number[]>([]);

  // Correos disponibles para dropdown al seleccionar cliente
  const [correosDisponibles, setCorreosDisponibles] = useState<string[]>([]);

  // Bulk correos para crear múltiples alquileres
  const [bulkInput, setBulkInput] = useState("");
  const [bulkCorreos, setBulkCorreos] = useState<string[]>([]);

  const [formRental, setFormRental] = useState({
    user_id: "",
    plataforma: "",
    correo: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    dias: "30",
    precio: "",
    divisa: "COP",
    notas: "",
  });

  const [formEditar, setFormEditar] = useState({
    plataforma: "",
    correo: "",
    fecha_inicio: "",
    dias: "30",
    fecha_fin: "",
    precio: "",
    divisa: "COP",
    estado: "activo",
    notas: "",
  });

  const [formDias, setFormDias] = useState("30");
  const [formPago, setFormPago] = useState({
    monto: "",
    divisa: "COP",
    fecha_pago: new Date().toISOString().split("T")[0],
    estado: "pagado",
    metodo: "",
    notas: "",
  });
  const [formPagoMasivo, setFormPagoMasivo] = useState({
    monto: "",
    divisa: "COP",
    fecha_pago: new Date().toISOString().split("T")[0],
    estado: "pagado",
    metodo: "",
    notas: "",
  });
  const [formGarantia, setFormGarantia] = useState({
    fecha_reporte: new Date().toISOString().split("T")[0],
    descripcion: "",
    cuenta_reemplazo: "",
    notas: "",
  });
  const [formResolver, setFormResolver] = useState({ cuenta_reemplazo: "", notas: "" });

  useEffect(() => {
    loadRentals();
    loadUsers();
    loadPlataformas();
    loadMetodosPago();
  }, []);

  const loadRentals = async () => {
    try {
      const data = await apiFetch("/api/alquileres");
      setRentals(data);
    } catch {
      toast.error("Error cargando alquileres");
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiFetch("/api/admin/users");
      setUsers(data);
    } catch {
      toast.error("Error cargando usuarios");
    }
  };

  const loadPlataformas = async () => {
    try {
      const data = await apiFetch("/api/alquileres/plataformas");
      setPlataformas(data);
    } catch {
      setPlataformas(DEFAULT_PLATAFORMAS.map((n, i) => ({ id: i + 1, nombre: n })));
    }
  };

  const loadMetodosPago = async () => {
    try {
      const data = await apiFetch("/api/alquileres/metodos-pago");
      setMetodosPago(data);
      if (data.length > 0) {
        setFormPago(f => ({ ...f, metodo: f.metodo || data[0].nombre }));
        setFormPagoMasivo(f => ({ ...f, metodo: f.metodo || data[0].nombre }));
      }
    } catch {
      setMetodosPago([{ id: 1, nombre: "Efectivo" }, { id: 2, nombre: "Nequi" }, { id: 3, nombre: "Daviplata" }, { id: 4, nombre: "Transferencia" }]);
    }
  };

  const handleAgregarMetodo = async () => {
    if (!nuevoMetodo.trim()) return;
    try {
      await apiFetch("/api/alquileres/metodos-pago", {
        method: "POST",
        body: JSON.stringify({ nombre: nuevoMetodo.trim() }),
      });
      toast.success(`Método "${nuevoMetodo.trim()}" agregado`);
      await loadMetodosPago();
      setNuevoMetodo("");
      setShowNuevoMetodo(false);
    } catch (err: any) {
      toast.error(err.message || "Error agregando método");
    }
  };

  const handleAgregarPlataforma = async () => {
    if (!nuevaPlataforma.trim()) return;
    try {
      await apiFetch("/api/alquileres/plataformas", {
        method: "POST",
        body: JSON.stringify({ nombre: nuevaPlataforma.trim() }),
      });
      toast.success(`Plataforma "${nuevaPlataforma.trim()}" agregada`);
      await loadPlataformas();
      setFormRental({ ...formRental, plataforma: nuevaPlataforma.trim() });
      setFormEditar({ ...formEditar, plataforma: nuevaPlataforma.trim() });
      setNuevaPlataforma("");
      setShowNuevaPlataforma(false);
    } catch (err: any) {
      toast.error(err.message || "Error agregando plataforma");
    }
  };

  const handleEliminarPlataforma = async (plat: Plataforma) => {
    if (!confirm(`¿Eliminar "${plat.nombre}" de la lista?`)) return;
    try {
      await apiFetch(`/api/alquileres/plataformas/${plat.id}`, { method: "DELETE" });
      toast.success(`"${plat.nombre}" eliminada`);
      await loadPlataformas();
    } catch (err: any) {
      toast.error(err.message || "Error eliminando plataforma");
    }
  };

  const toggleCuenta = (id: number) => {
    setSelectedCuentas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllCuentas = () => {
    if (selectedCuentas.length === clientRentals.length) {
      setSelectedCuentas([]);
    } else {
      setSelectedCuentas(clientRentals.map((r) => r.id));
    }
  };

  const handleEliminarMasivo = async () => {
    if (selectedCuentas.length === 0) return;
    try {
      for (const id of selectedCuentas) {
        await apiFetch(`/api/alquileres/${id}`, { method: "DELETE" });
      }
      toast.success(`${selectedCuentas.length} cuenta(s) eliminada(s)`);
      setShowModal(false);
      setSelectedCuentas([]);
      await loadRentals();
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error eliminando cuentas");
    }
  };

  const handlePagoMasivo = async () => {
    if (selectedCuentas.length === 0) return;
    if (!formPagoMasivo.monto || parseFloat(formPagoMasivo.monto) <= 0) {
      toast.error("El monto es obligatorio");
      return;
    }
    if (!formPagoMasivo.fecha_pago) {
      toast.error("La fecha es obligatoria");
      return;
    }
    try {
      for (const id of selectedCuentas) {
        await apiFetch(`/api/alquileres/${id}/pagos`, {
          method: "POST",
          body: JSON.stringify({ ...formPagoMasivo, monto: parseFloat(formPagoMasivo.monto) }),
        });
      }
      toast.success(`Pago registrado en ${selectedCuentas.length} cuenta(s)`);
      setShowModal(false);
      setSelectedCuentas([]);
      setFormPagoMasivo({ monto: "", divisa: "COP", fecha_pago: new Date().toISOString().split("T")[0], estado: "pagado", metodo: metodosPago[0]?.nombre || "Efectivo", notas: "" });
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error registrando pagos");
    }
  };

  const parseBulkCorreos = (input: string) => {
    const parsed = input
      .split(/[;\n,\s]+/)
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0 && c.includes("@") && c.includes("."));
    const unique = [...new Set(parsed)];
    setBulkCorreos(unique);
  };

  const removeBulkCorreo = (correo: string) => {
    setBulkCorreos((prev) => prev.filter((c) => c !== correo));
  };

  const loadCorreos = async (userId: string) => {
    if (!userId) { setCorreosDisponibles([]); return; }
    try {
      const data = await apiFetch(`/api/alquileres/usuario/${userId}/correos`);
      setCorreosDisponibles(data);
    } catch {
      setCorreosDisponibles([]);
    }
  };

  // Ordenar alquileres por fecha_fin ASC (más próximo primero)
  const sortedRentals = [...rentals].sort((a, b) =>
    new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime()
  );

  // Aplanar: una fila por alquiler, no agrupado
  const flatRows = sortedRentals.filter((r) => {
    const matchSearch =
      r.cliente_nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.cliente_email?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.plataforma?.toLowerCase().includes(searchText.toLowerCase()) ||
      (r.correo || "").toLowerCase().includes(searchText.toLowerCase());
    const matchEstado =
      filterEstado === "todos" ||
      (filterEstado === "vencer" ? r.dias_restantes >= 0 && r.dias_restantes <= 3 : r.estado === filterEstado);
    const matchCliente =
      filterCliente === "" || r.user_id === parseInt(filterCliente);
    return matchSearch && matchEstado && matchCliente;
  });

  // Alquileres del cliente seleccionado (para el panel de detalle)
  const clientRentals = selectedClient
    ? sortedRentals.filter((r) => r.user_id === selectedClient)
    : [];

  const clientInfo = selectedClient
    ? rentals.find((r) => r.user_id === selectedClient)
    : null;

  const handleSelectClient = async (userId: number) => {
    if (selectedClient === userId) {
      setSelectedClient(null);
      return;
    }
    setSelectedClient(userId);
    setActiveTab("cuentas");
    const clientRentalsLocal = rentals.filter((r) => r.user_id === userId);
    const allPagos: Pago[] = [];
    const allGarantias: Garantia[] = [];
    for (const r of clientRentalsLocal) {
      try {
        const [p, g] = await Promise.all([
          apiFetch(`/api/alquileres/${r.id}/pagos`),
          apiFetch(`/api/alquileres/${r.id}/garantias`),
        ]);
        allPagos.push(...p);
        allGarantias.push(...g);
      } catch {}
    }
    setPagos(allPagos);
    setGarantias(allGarantias);
  };

  const refreshClientDetail = async (userId: number) => {
    const clientRentalsLocal = rentals.filter((r) => r.user_id === userId);
    const allPagos: Pago[] = [];
    const allGarantias: Garantia[] = [];
    for (const r of clientRentalsLocal) {
      try {
        const [p, g] = await Promise.all([
          apiFetch(`/api/alquileres/${r.id}/pagos`),
          apiFetch(`/api/alquileres/${r.id}/garantias`),
        ]);
        allPagos.push(...p);
        allGarantias.push(...g);
      } catch {}
    }
    setPagos(allPagos);
    setGarantias(allGarantias);
  };

  const handleCreateRental = async () => {
    if (!formRental.user_id || !formRental.plataforma || !formRental.fecha_inicio || !formRental.dias) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    const fecha_fin = addDays(formRental.fecha_inicio, parseInt(formRental.dias));
    const correosParaCrear = bulkCorreos.length > 0 ? bulkCorreos : [formRental.correo || null];

    try {
      for (const correo of correosParaCrear) {
        await apiFetch("/api/alquileres", {
          method: "POST",
          body: JSON.stringify({
            user_id: parseInt(formRental.user_id),
            plataforma: formRental.plataforma,
            correo: correo || null,
            fecha_inicio: formRental.fecha_inicio,
            fecha_fin,
            precio: parseFloat(formRental.precio) || 0,
            notas: formRental.notas,
          }),
        });
      }
      const total = correosParaCrear.length;
      toast.success(total > 1 ? `${total} alquileres creados` : "Alquiler creado");
      setShowModal(false);
      setFormRental({
        user_id: "", plataforma: "", correo: "",
        fecha_inicio: new Date().toISOString().split("T")[0],
        dias: "30", precio: "", divisa: "COP", notas: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Error creando alquiler");
    }
  };

  const handleEditarRental = async () => {
    if (!selectedRental) return;
    try {
      const fecha_fin = addDays(formEditar.fecha_inicio, parseInt(formEditar.dias));
      await apiFetch(`/api/alquileres/${selectedRental.id}`, {
        method: "PUT",
        body: JSON.stringify({
          plataforma: formEditar.plataforma,
          correo: formEditar.correo || null,
          fecha_inicio: formEditar.fecha_inicio,
          fecha_fin,
          precio: parseFloat(formEditar.precio) || 0,
          estado: formEditar.estado,
          notas: formEditar.notas,
        }),
      });
      toast.success("Alquiler actualizado");
      setShowModal(false);
      await loadRentals();
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error actualizando alquiler");
    }
  };

  const handleRenovar = async () => {
    if (!selectedRental) return;
    try {
      await apiFetch(`/api/alquileres/${selectedRental.id}/renovar`, {
        method: "PUT",
        body: JSON.stringify({ dias: parseInt(formDias) }),
      });
      toast.success(`Renovado por ${formDias} días`);
      setShowModal(false);
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || "Error renovando");
    }
  };

  const handleRegistrarPago = async () => {
    if (!selectedRental) return;
    try {
      await apiFetch(`/api/alquileres/${selectedRental.id}/pagos`, {
        method: "POST",
        body: JSON.stringify({ ...formPago, monto: parseFloat(formPago.monto) }),
      });
      toast.success("Pago registrado");
      setShowModal(false);
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error registrando pago");
    }
  };

  const handleRegistrarGarantia = async () => {
    if (!selectedRental) return;
    try {
      await apiFetch(`/api/alquileres/${selectedRental.id}/garantias`, {
        method: "POST",
        body: JSON.stringify(formGarantia),
      });
      toast.success("Garantía registrada");
      setShowModal(false);
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error registrando garantía");
    }
  };

  const handleResolverGarantia = async () => {
    if (!modalData) return;
    try {
      await apiFetch(`/api/alquileres/garantias/${modalData.id}/resolver`, {
        method: "PUT",
        body: JSON.stringify(formResolver),
      });
      toast.success("Garantía resuelta");
      setShowModal(false);
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error resolviendo garantía");
    }
  };

  const handleDeleteRental = async () => {
    if (!selectedRental) return;
    try {
      await apiFetch(`/api/alquileres/${selectedRental.id}`, { method: "DELETE" });
      toast.success("Alquiler eliminado");
      setShowModal(false);
      await loadRentals();
      // Si el cliente ya no tiene más alquileres, cerrar panel
      const remaining = rentals.filter(
        (r) => r.user_id === selectedClient && r.id !== selectedRental.id
      );
      if (remaining.length === 0) setSelectedClient(null);
    } catch {
      toast.error("Error eliminando alquiler");
    }
  };

  const openModal = (type: typeof modalType, rental?: Rental, data?: any) => {
    setModalType(type);
    setSelectedRental(rental || null);
    setModalData(data || null);

    if (type === "editar" && rental) {
      const dias = Math.round(
        (new Date(rental.fecha_fin).getTime() - new Date(rental.fecha_inicio).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      setFormEditar({
        plataforma: rental.plataforma,
        correo: rental.correo || "",
        fecha_inicio: rental.fecha_inicio.split("T")[0],
        dias: String(dias),
        fecha_fin: rental.fecha_fin.split("T")[0],
        precio: String(rental.precio),
        divisa: "COP",
        estado: rental.estado,
        notas: rental.notas || "",
      });
      // Cargar correos del cliente para el dropdown de edición
      loadCorreos(String(rental.user_id));
    }

    if (type === "renovar") setFormDias("30");
    if (type === "pago") setFormPago({ monto: "", divisa: "COP", fecha_pago: new Date().toISOString().split("T")[0], estado: "pagado", metodo: metodosPago[0]?.nombre || "Efectivo", notas: "" });
    if (type === "garantia") setFormGarantia({ fecha_reporte: new Date().toISOString().split("T")[0], descripcion: "", cuenta_reemplazo: "", notas: "" });
    if (type === "resolver") setFormResolver({ cuenta_reemplazo: "", notas: "" });

    setShowModal(true);
  };

  const getDiasColor = (dias: number) => {
    if (dias < 0) return "vencido";
    if (dias <= 3) return "urgente";
    if (dias <= 7) return "proximo";
    return "ok";
  };

  const totalActivos = rentals.filter((r) => r.estado === "activo").length;
  const totalVencer = rentals.filter((r) => r.dias_restantes >= 0 && r.dias_restantes <= 3).length;
  const totalPendiente = rentals.filter((r) => r.pago_estado === "pendiente").length;

  return (
    <div className="rentals-container">
      <div className="rentals-header">
        <div className="rentals-header-left">
          <h2>Alquileres</h2>
          <div className="rentals-stats">
            <span className="stat-chip activo">{totalActivos} activos</span>
            <span className="stat-chip urgente">{totalVencer} por vencer</span>
            <span className="stat-chip pendiente">{totalPendiente} pago pendiente</span>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setModalType("crear");
            setFormRental({
              user_id: "", plataforma: "", correo: "",
              fecha_inicio: new Date().toISOString().split("T")[0],
              dias: "30", precio: "", divisa: "COP", notas: "",
            });
            setBulkInput("");
            setBulkCorreos([]);
            setCorreosDisponibles([]);
            setShowModal(true);
          }}
        >
          + Nuevo alquiler
        </button>
      </div>

      <div className="rentals-filters">
        <input
          type="text"
          placeholder="Buscar cliente, plataforma o correo..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="filter-input"
        />
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="filter-select">
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="vencer">Por vencer</option>
          <option value="vencido">Vencidos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      <div className="rentals-card">
        <div className="rentals-table-wrap">
          <table className="rentals-table">
            <thead>
              <tr>
                <th>
                  <select
                    className="th-cliente-select"
                    value={filterCliente}
                    onChange={(e) => {
                      setFilterCliente(e.target.value);
                      setSelectedClient(e.target.value ? parseInt(e.target.value) : null);
                    }}
                  >
                    <option value="">Todos los clientes</option>
                    {[...new Map(rentals.map((r) => [r.user_id, r])).values()]
                      .sort((a, b) => a.cliente_nombre.localeCompare(b.cliente_nombre))
                      .map((r) => (
                        <option key={r.user_id} value={r.user_id}>
                          {r.cliente_nombre}
                        </option>
                      ))}
                  </select>
                </th>
                <th>Plataforma</th>
                <th>Correo cuenta</th>
                <th>Vence</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (flatRows.length === 0) {
                  return (
                    <tr><td colSpan={6} className="empty-row">No hay alquileres</td></tr>
                  );
                }
                // Agrupar por fecha_fin
                const grupos: { [fecha: string]: Rental[] } = {};
                flatRows.forEach((r) => {
                  const key = r.fecha_fin.split("T")[0];
                  if (!grupos[key]) grupos[key] = [];
                  grupos[key].push(r);
                });
                return Object.entries(grupos)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .flatMap(([fecha, rows]) => {
                    const isOpen = gruposTablaAbiertos.includes(fecha);
                    const minDias = Math.min(...rows.map(r => r.dias_restantes));
                    const colorFecha = minDias < 0 ? "vencido" : minDias <= 3 ? "urgente" : minDias <= 7 ? "proximo" : "ok";
                    const toggleGrupo = () => setGruposTablaAbiertos(prev =>
                      prev.includes(fecha) ? prev.filter(f => f !== fecha) : [...prev, fecha]
                    );
                    return [
                      // Fila cabecera del grupo
                      <tr key={`grupo-${fecha}`} className="grupo-fecha-row" onClick={toggleGrupo}>
                        <td colSpan={6}>
                          <div className="grupo-fecha-header">
                            <span className="grupo-fecha-arrow">{isOpen ? "▼" : "▶"}</span>
                            <span className="grupo-fecha-label">📅 {formatDate(fecha)}</span>
                            <span className="grupo-fecha-count">{rows.length} cuenta{rows.length > 1 ? "s" : ""}</span>
                            <span className={`dias-badge ${colorFecha}`} style={{ marginLeft: "auto" }}>
                              {minDias < 0 ? `${Math.abs(minDias)}d vencido` : `${minDias}d`}
                            </span>
                          </div>
                        </td>
                      </tr>,
                      // Filas de cuentas (solo si está abierto)
                      ...(isOpen ? rows.map((r) => {
                        const initials = r.cliente_nombre?.split(" ").map((w) => w[0]).join("").substring(0, 2) || "??";
                        const isSelected = selectedClient === r.user_id;
                        return (
                          <tr
                            key={r.id}
                            className={`rental-row ${isSelected ? "selected" : ""} ${r.dias_restantes <= 3 && r.dias_restantes >= 0 ? "row-urgent" : ""}`}
                            onClick={() => handleSelectClient(r.user_id)}
                          >
                            <td>
                              <div className="client-cell">
                                <div className="client-avatar">{initials}</div>
                                <div>
                                  <span className="client-name">{r.cliente_nombre}</span>
                                  <span className="client-email">{r.cliente_email}</span>
                                </div>
                              </div>
                            </td>
                            <td><span className="plataforma-badge">{r.plataforma}</span></td>
                            <td>
                              {r.correo ? <span className="correo-cuenta">{r.correo}</span> : <span className="correo-vacio">—</span>}
                            </td>
                            <td>
                              <span className={`dias-badge ${getDiasColor(r.dias_restantes)}`}>
                                {r.dias_restantes < 0 ? `${Math.abs(r.dias_restantes)}d vencido` : `${r.dias_restantes}d`}
                              </span>
                            </td>
                            <td>
                              <span className={`estado-badge ${r.dias_restantes >= 0 && r.dias_restantes <= 3 ? "urgente" : r.estado}`}>
                                {r.dias_restantes >= 0 && r.dias_restantes <= 3 ? "por vencer" : r.estado}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>Ver ▶</td>
                          </tr>
                        );
                      }) : [])
                    ];
                  });
              })()}
            </tbody>
          </table>
        </div>

        {/* ─── PANEL DE DETALLE DEL CLIENTE ─── */}
        {selectedClient && clientInfo && (
          <div className="rental-detail">
            <div className="detail-header">
              <div className="detail-header-info">
                <h3>
                  <span className="client-avatar-sm">
                    {clientInfo.cliente_nombre?.split(" ").map((w) => w[0]).join("").substring(0, 2)}
                  </span>
                  {clientInfo.cliente_nombre}
                </h3>
                <span className="detail-email">{clientInfo.cliente_email}</span>
              </div>
              <div className="detail-tabs">
                <button
                  className={activeTab === "cuentas" ? "active" : ""}
                  onClick={() => setActiveTab("cuentas")}
                >
                  📦 Cuentas ({clientRentals.length})
                </button>
                <button
                  className={activeTab === "pagos" ? "active" : ""}
                  onClick={() => setActiveTab("pagos")}
                >
                  💳 Pagos ({pagos.length})
                </button>
                <button
                  className={activeTab === "garantias" ? "active" : ""}
                  onClick={() => setActiveTab("garantias")}
                >
                  🛡️ Garantías ({garantias.length})
                </button>
              </div>
            </div>

            {/* TAB CUENTAS */}
            {activeTab === "cuentas" && (
              <div className="detail-list">
                <div className="cuentas-toolbar">
                  <label className="checkbox-label-cuenta">
                    <input
                      type="checkbox"
                      checked={selectedCuentas.length === clientRentals.length && clientRentals.length > 0}
                      onChange={toggleAllCuentas}
                      style={{ accentColor: "#6c63ff", cursor: "pointer" }}
                    />
                    <span>Seleccionar todas</span>
                    {selectedCuentas.length > 0 && (
                      <span className="cuentas-sel-count">{selectedCuentas.length} seleccionadas</span>
                    )}
                  </label>
                  {selectedCuentas.length > 0 && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn-pago-masivo" onClick={() => { setFormPagoMasivo({ monto: "", divisa: "COP", fecha_pago: new Date().toISOString().split("T")[0], estado: "pagado", metodo: metodosPago[0]?.nombre || "Efectivo", notas: "" }); setModalType("pagoMasivo"); setShowModal(true); }}>
                        💳 Registrar pago a {selectedCuentas.length} cuenta(s)
                      </button>
                      <button className="btn-eliminar-masivo" onClick={() => { setModalType("deleteMasivo"); setShowModal(true); }}>
                        🗑 Eliminar {selectedCuentas.length} seleccionada(s)
                      </button>
                    </div>
                  )}
                </div>

                {/* Grupos por fecha de vencimiento */}
                <div className="cuentas-scroll-list">
                  {(() => {
                    const grupos: { [fecha: string]: Rental[] } = {};
                    clientRentals.forEach((r) => {
                      const key = r.fecha_fin.split("T")[0];
                      if (!grupos[key]) grupos[key] = [];
                      grupos[key].push(r);
                    });
                    return Object.entries(grupos)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([fecha, rentas]) => {
                        const isOpen = gruposAbiertos.includes(fecha);
                        const minDias = Math.min(...rentas.map(r => r.dias_restantes));
                        const colorFecha = minDias < 0 ? "urgente" : minDias <= 3 ? "urgente" : minDias <= 7 ? "proximo" : "ok";
                        return (
                          <div key={fecha} className="fecha-grupo">
                            <div
                              className={`fecha-grupo-header ${colorFecha}`}
                              onClick={() => setGruposAbiertos(prev =>
                                prev.includes(fecha) ? prev.filter(f => f !== fecha) : [...prev, fecha]
                              )}
                            >
                              <span className="fecha-grupo-arrow">{isOpen ? "▼" : "▶"}</span>
                              <input
                                type="checkbox"
                                checked={rentas.every(r => selectedCuentas.includes(r.id))}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const ids = rentas.map(r => r.id);
                                  if (rentas.every(r => selectedCuentas.includes(r.id))) {
                                    setSelectedCuentas(prev => prev.filter(id => !ids.includes(id)));
                                  } else {
                                    setSelectedCuentas(prev => [...new Set([...prev, ...ids])]);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ accentColor: "#6c63ff", cursor: "pointer", flexShrink: 0 }}
                              />
                              <span className="fecha-grupo-fecha">📅 {formatDate(fecha)}</span>
                              <span className="fecha-grupo-count">{rentas.length} cuenta{rentas.length > 1 ? "s" : ""}</span>
                              <div className="fecha-grupo-indicators">
                                {(() => {
                                  const pagadas = rentas.filter(r => r.pago_estado === "pagado").length;
                                  const pendientes = rentas.filter(r => r.pago_estado === "pendiente").length;
                                  const sinPago = rentas.filter(r => !r.pago_estado).length;
                                  return (
                                    <>
                                      {pagadas > 0 && <span className="ind-badge pagado">✓ {pagadas} pagado{pagadas > 1 ? "s" : ""}</span>}
                                      {pendientes > 0 && <span className="ind-badge pendiente">⏳ {pendientes} pendiente{pendientes > 1 ? "s" : ""}</span>}
                                      {sinPago > 0 && <span className="ind-badge sin-pago">— {sinPago} sin pago</span>}
                                    </>
                                  );
                                })()}
                              </div>
                              <span className={`dias-badge ${colorFecha}`} style={{ marginLeft: "auto" }}>
                                {minDias < 0 ? `${Math.abs(minDias)}d vencido` : `${minDias}d`}
                              </span>
                            </div>
                            {isOpen && rentas.map((r) => (
                              <div key={r.id} className={`detail-item cuenta-item ${r.dias_restantes <= 3 ? "por-vencer" : ""} ${selectedCuentas.includes(r.id) ? "cuenta-selected" : ""}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedCuentas.includes(r.id)}
                                  onChange={() => toggleCuenta(r.id)}
                                  style={{ accentColor: "#6c63ff", cursor: "pointer", flexShrink: 0 }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="cuenta-info">
                                  <span className="plataforma-badge">{r.plataforma}</span>
                                  {r.correo && <span className="correo-cuenta-detail">📧 {r.correo}</span>}
                                  <span className={`dias-badge ${getDiasColor(r.dias_restantes)}`}>
                                    {r.dias_restantes < 0 ? `${Math.abs(r.dias_restantes)}d vencido` : `${r.dias_restantes}d restantes`}
                                  </span>
                                  <span className={`pago-badge ${r.pago_estado || "sin-pago"}`}>{r.pago_estado || "sin pago"}</span>
                                  {r.precio > 0 && <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>${Number(r.precio).toLocaleString("es-CO")}</span>}
                                </div>
                                <div className="cuenta-actions">
                                  <button className="btn-icon editar" title="Editar" onClick={(e) => { e.stopPropagation(); openModal("editar", r); }}>✏️</button>
                                  <button className="btn-icon renovar" title="Renovar" onClick={(e) => { e.stopPropagation(); openModal("renovar", r); }}>↻</button>
                                  <button className="btn-icon pago" title="Pago" onClick={(e) => { e.stopPropagation(); openModal("pago", r); }}>💳</button>
                                  <button className="btn-icon garantia" title="Garantía" onClick={(e) => { e.stopPropagation(); openModal("garantia", r); }}>🛡️</button>
                                  <button className="btn-icon delete" title="Eliminar" onClick={(e) => { e.stopPropagation(); openModal("delete", r); }}>✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      });
                  })()}
                </div>

                <button className="btn-agregar-cuenta" onClick={() => { setFormRental({ user_id: String(selectedClient), plataforma: "", correo: "", fecha_inicio: new Date().toISOString().split("T")[0], dias: "30", precio: "", divisa: "COP", notas: "" }); loadCorreos(String(selectedClient)); setModalType("crear"); setShowModal(true); }}>
                  + Agregar cuenta
                </button>
              </div>
            )}

            {/* TAB PAGOS */}
            {activeTab === "pagos" && (
              <div className="detail-list">
                {pagos.length === 0 && <p className="empty-msg">Sin pagos registrados</p>}
                {pagos.map((p, i) => {
                  const rental = clientRentals.find((r) => r.id === p.alquiler_id);
                  return (
                    <div key={i} className="detail-item pago-item">
                      <div className="pago-info">
                        {rental && <span className="plataforma-badge">{rental.plataforma}</span>}
                        {rental?.correo && <span className="correo-tag">{rental.correo}</span>}
                        <span className={`pago-badge ${p.estado}`}>{p.estado}</span>
                        <span className="pago-monto">${Number(p.monto).toLocaleString("es-CO")}</span>
                        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                          {formatDate(p.fecha_pago)}
                        </span>
                        <span className="metodo-tag">{p.metodo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB GARANTÍAS */}
            {activeTab === "garantias" && (
              <div className="detail-list">
                {garantias.length === 0 && <p className="empty-msg">Sin garantías registradas</p>}
                {garantias.map((g, i) => {
                  const rental = clientRentals.find((r) => r.id === g.alquiler_id);
                  return (
                    <div key={i} className="detail-item garantia-item">
                      <div className="garantia-info">
                        {rental && <span className="plataforma-badge">{rental.plataforma}</span>}
                        {rental?.correo && (
                          <span className="correo-tag">📧 {rental.correo}</span>
                        )}
                        <span className={`garantia-estado ${g.estado}`}>{g.estado}</span>
                        <span className="garantia-desc">{g.descripcion}</span>
                        {g.cuenta_reemplazo && (
                          <span className="garantia-reemplazo">→ {g.cuenta_reemplazo}</span>
                        )}
                      </div>
                      {g.estado === "pendiente" && (
                        <button
                          className="btn-resolver"
                          onClick={() => openModal("resolver", undefined, g)}
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALES ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal rentals-modal" onClick={(e) => e.stopPropagation()}>

            {/* MODAL CREAR */}
            {modalType === "crear" && (
              <>
                <h3>Nuevo Alquiler</h3>
                <select
                  value={formRental.user_id}
                  onChange={(e) => {
                    setFormRental({ ...formRental, user_id: e.target.value, correo: "" });
                    loadCorreos(e.target.value);
                  }}
                >
                  <option value="">Seleccionar cliente *</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} — {u.email}
                    </option>
                  ))}
                </select>

                <label>Plataforma *</label>
                <div className="plataforma-selector">
                  <div className="plataforma-lista">
                    {plataformas.map((p) => (
                      <div
                        key={p.id}
                        className={`plataforma-item ${formRental.plataforma === p.nombre ? "selected" : ""}`}
                        onClick={() => { setFormRental({ ...formRental, plataforma: p.nombre }); setShowNuevaPlataforma(false); }}
                      >
                        <span>{p.nombre}</span>
                        <button
                          className="plat-delete"
                          title="Eliminar plataforma"
                          onClick={(e) => { e.stopPropagation(); handleEliminarPlataforma(p); }}
                        >🗑️</button>
                      </div>
                    ))}
                    <div
                      className="plataforma-item agregar"
                      onClick={() => setShowNuevaPlataforma(!showNuevaPlataforma)}
                    >
                      ➕ Agregar nueva plataforma...
                    </div>
                  </div>
                  {formRental.plataforma && (
                    <div className="plataforma-selected-label">
                      Seleccionada: <strong>{formRental.plataforma}</strong>
                    </div>
                  )}
                </div>

                {showNuevaPlataforma && (
                  <div className="nueva-plataforma-row">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva plataforma"
                      value={nuevaPlataforma}
                      onChange={(e) => setNuevaPlataforma(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataforma()}
                      autoFocus
                    />
                    <button className="btn-agregar-plat" onClick={handleAgregarPlataforma}>Agregar</button>
                  </div>
                )}

                <label>Fecha inicio *</label>
                <input
                  type="date"
                  value={formRental.fecha_inicio}
                  onChange={(e) => setFormRental({ ...formRental, fecha_inicio: e.target.value })}
                />

                <label>Días asignados *</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      className={`dias-btn ${formRental.dias === String(d) ? "active" : ""}`}
                      onClick={() => setFormRental({ ...formRental, dias: String(d) })}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="O escribe los días manualmente (ej: 1, 6, 90...)"
                  value={formRental.dias}
                  onChange={(e) => setFormRental({ ...formRental, dias: e.target.value })}
                  min="1"
                />

                {formRental.fecha_inicio && formRental.dias && parseInt(formRental.dias) > 0 && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Vence:{" "}
                    {formatDate(addDays(formRental.fecha_inicio, parseInt(formRental.dias)))}{" "}
                    — <strong>{formRental.dias} días</strong>
                  </p>
                )}

                <input
                  type="number"
                  placeholder="Precio por cuenta"
                  value={formRental.precio}
                  onChange={(e) => setFormRental({ ...formRental, precio: e.target.value })}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <select value={formRental.divisa} onChange={(e) => setFormRental({ ...formRental, divisa: e.target.value })} style={{ flex: 1 }}>
                    <option value="COP">COP</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                <label>Organiza múltiples correos separados por <span style={{ color: "#a5b4fc", fontFamily: "monospace" }}>;</span></label>
                <textarea
                  rows={3}
                  placeholder="correo1@gmail.com;correo2@gmail.com;correo3@gmail.com"
                  value={bulkInput}
                  onChange={(e) => {
                    setBulkInput(e.target.value);
                    parseBulkCorreos(e.target.value);
                  }}
                  style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                />

                {bulkCorreos.length > 0 && (
                  <div className="bulk-preview">
                    <div className="bulk-preview-header">
                      <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                        Cuentas detectadas
                      </span>
                      <span className="bulk-count">{bulkCorreos.length} cuenta{bulkCorreos.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="bulk-list">
                      {bulkCorreos.map((c) => (
                        <div key={c} className="bulk-item">
                          <span className="bulk-correo">{c}</span>
                          <button className="bulk-remove" onClick={() => removeBulkCorreo(c)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                      Se crearán {bulkCorreos.length} alquileres individuales — cada uno editable y con garantía propia
                    </p>
                  </div>
                )}

                {bulkCorreos.length === 0 && (
                  <>
                    <label>O selecciona un correo individual</label>
                    {correosDisponibles.length > 0 ? (
                      <select
                        value={formRental.correo}
                        onChange={(e) => setFormRental({ ...formRental, correo: e.target.value })}
                      >
                        <option value="">Sin correo asignado</option>
                        {correosDisponibles.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="correo@ejemplo.com (opcional)"
                        value={formRental.correo}
                        onChange={(e) => setFormRental({ ...formRental, correo: e.target.value })}
                      />
                    )}
                  </>
                )}

                <textarea
                  placeholder="Notas (opcional)"
                  value={formRental.notas}
                  onChange={(e) => setFormRental({ ...formRental, notas: e.target.value })}
                />

                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleCreateRental}>
                    {bulkCorreos.length > 1
                      ? `Crear ${bulkCorreos.length} alquileres`
                      : "Crear alquiler"}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL EDITAR */}
            {modalType === "editar" && selectedRental && (
              <>
                <h3>✏️ Editar Alquiler</h3>
                <p className="modal-subtitle">
                  {selectedRental.cliente_nombre} — ID #{selectedRental.id}
                </p>
                <label>Plataforma *</label>
                <div className="plataforma-selector">
                  <div className="plataforma-lista">
                    {plataformas.map((p) => (
                      <div
                        key={p.id}
                        className={`plataforma-item ${formEditar.plataforma === p.nombre ? "selected" : ""}`}
                        onClick={() => { setFormEditar({ ...formEditar, plataforma: p.nombre }); setShowNuevaPlataforma(false); }}
                      >
                        <span>{p.nombre}</span>
                        <button
                          className="plat-delete"
                          title="Eliminar plataforma"
                          onClick={(e) => { e.stopPropagation(); handleEliminarPlataforma(p); }}
                        >🗑️</button>
                      </div>
                    ))}
                    <div
                      className="plataforma-item agregar"
                      onClick={() => setShowNuevaPlataforma(!showNuevaPlataforma)}
                    >
                      ➕ Agregar nueva plataforma...
                    </div>
                  </div>
                  {formEditar.plataforma && (
                    <div className="plataforma-selected-label">
                      Seleccionada: <strong>{formEditar.plataforma}</strong>
                    </div>
                  )}
                </div>

                {showNuevaPlataforma && (
                  <div className="nueva-plataforma-row">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva plataforma"
                      value={nuevaPlataforma}
                      onChange={(e) => setNuevaPlataforma(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataforma()}
                      autoFocus
                    />
                    <button className="btn-agregar-plat" onClick={handleAgregarPlataforma}>Agregar</button>
                  </div>
                )}
                <label>Correo de la cuenta</label>
                {correosDisponibles.length > 0 ? (
                  <select
                    value={formEditar.correo}
                    onChange={(e) => setFormEditar({ ...formEditar, correo: e.target.value })}
                  >
                    <option value="">Sin correo asignado</option>
                    {correosDisponibles.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Correo de la cuenta (opcional)"
                    value={formEditar.correo}
                    onChange={(e) => setFormEditar({ ...formEditar, correo: e.target.value })}
                  />
                )}
                <label>Fecha inicio *</label>
                <input
                  type="date"
                  value={formEditar.fecha_inicio}
                  onChange={(e) => setFormEditar({ ...formEditar, fecha_inicio: e.target.value })}
                />
                <label>Días asignados *</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      className={`dias-btn ${formEditar.dias === String(d) ? "active" : ""}`}
                      onClick={() => setFormEditar({ ...formEditar, dias: String(d) })}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Días"
                  value={formEditar.dias}
                  onChange={(e) => setFormEditar({ ...formEditar, dias: e.target.value })}
                  min="1"
                />
                {formEditar.fecha_inicio && formEditar.dias && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Vence:{" "}
                    {formatDate(addDays(formEditar.fecha_inicio, parseInt(formEditar.dias) || 0))}
                  </p>
                )}
                <input
                  type="number"
                  placeholder="Precio"
                  value={formEditar.precio}
                  onChange={(e) => setFormEditar({ ...formEditar, precio: e.target.value })}
                />
                <select value={formEditar.divisa} onChange={(e) => setFormEditar({ ...formEditar, divisa: e.target.value })}>
                  <option value="COP">COP</option>
                  <option value="USDT">USDT</option>
                </select>
                <label>Estado</label>
                <select
                  value={formEditar.estado}
                  onChange={(e) => setFormEditar({ ...formEditar, estado: e.target.value })}
                >
                  <option value="activo">Activo</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <textarea
                  placeholder="Notas (opcional)"
                  value={formEditar.notas}
                  onChange={(e) => setFormEditar({ ...formEditar, notas: e.target.value })}
                />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleEditarRental}>Guardar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL RENOVAR */}
            {modalType === "renovar" && (
              <>
                <h3>Renovar cuenta</h3>
                <p className="modal-subtitle">
                  {selectedRental?.plataforma}
                  {selectedRental?.correo && ` — ${selectedRental.correo}`}
                  {" — vence "}
                  {selectedRental && formatDate(selectedRental.fecha_fin)}
                </p>
                <label>Días a extender</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      className={`dias-btn ${formDias === String(d) ? "active" : ""}`}
                      onClick={() => setFormDias(String(d))}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={formDias}
                  onChange={(e) => setFormDias(e.target.value)}
                  min="1"
                />
                {selectedRental && formDias && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Nueva fecha fin:{" "}
                    {formatDate(addDays(selectedRental.fecha_fin, parseInt(formDias) || 0))}
                  </p>
                )}
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRenovar}>Renovar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL PAGO */}
            {modalType === "pago" && (
              <>
                <h3>Registrar Pago</h3>
                <p className="modal-subtitle">
                  {selectedRental?.plataforma}
                  {selectedRental?.correo && ` — ${selectedRental.correo}`}
                </p>
                <input
                  type="number"
                  placeholder="Monto (COP) *"
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                />
                <label>Fecha de pago</label>
                <input
                  type="date"
                  value={formPago.fecha_pago}
                  onChange={(e) => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                />
                <select value={formPago.estado} onChange={(e) => setFormPago({ ...formPago, estado: e.target.value })}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencido">Vencido</option>
                </select>
                <label>Divisa</label>
                <select value={formPago.divisa} onChange={(e) => setFormPago({ ...formPago, divisa: e.target.value })}>
                  <option value="COP">COP — Peso colombiano</option>
                  <option value="USDT">USDT — Dólar</option>
                </select>
                <label>Método de pago</label>
                <select value={formPago.metodo} onChange={(e) => { if (e.target.value === "__nuevo__") { setShowNuevoMetodo(true); } else { setFormPago({ ...formPago, metodo: e.target.value }); setShowNuevoMetodo(false); } }}>
                  {metodosPago.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                  <option value="__nuevo__">➕ Agregar método...</option>
                </select>
                {showNuevoMetodo && (
                  <div className="nueva-plataforma-row">
                    <input type="text" placeholder="Nombre del método" value={nuevoMetodo} onChange={(e) => setNuevoMetodo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAgregarMetodo()} autoFocus />
                    <button className="btn-agregar-plat" onClick={handleAgregarMetodo}>Agregar</button>
                  </div>
                )}
                <textarea placeholder="Notas (opcional)" value={formPago.notas} onChange={(e) => setFormPago({ ...formPago, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRegistrarPago}>Registrar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL GARANTÍA */}
            {modalType === "garantia" && (
              <>
                <h3>Registrar Garantía</h3>
                <p className="modal-subtitle">
                  {selectedRental?.plataforma}
                  {selectedRental?.correo && (
                    <span style={{ color: "#a5b4fc" }}> — {selectedRental.correo}</span>
                  )}
                </p>
                <label>Fecha de reporte</label>
                <input
                  type="date"
                  value={formGarantia.fecha_reporte}
                  onChange={(e) => setFormGarantia({ ...formGarantia, fecha_reporte: e.target.value })}
                />
                <textarea
                  placeholder="Descripción del problema *"
                  value={formGarantia.descripcion}
                  onChange={(e) => setFormGarantia({ ...formGarantia, descripcion: e.target.value })}
                />
                <input
                  placeholder="Cuenta de reemplazo (opcional)"
                  value={formGarantia.cuenta_reemplazo}
                  onChange={(e) => setFormGarantia({ ...formGarantia, cuenta_reemplazo: e.target.value })}
                />
                <textarea
                  placeholder="Notas (opcional)"
                  value={formGarantia.notas}
                  onChange={(e) => setFormGarantia({ ...formGarantia, notas: e.target.value })}
                />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRegistrarGarantia}>Registrar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL RESOLVER GARANTÍA */}
            {modalType === "resolver" && (
              <>
                <h3>Resolver Garantía</h3>
                <p className="modal-subtitle">{modalData?.descripcion}</p>
                <input
                  placeholder="Cuenta de reemplazo suministrada"
                  value={formResolver.cuenta_reemplazo}
                  onChange={(e) => setFormResolver({ ...formResolver, cuenta_reemplazo: e.target.value })}
                />
                <textarea
                  placeholder="Notas de resolución"
                  value={formResolver.notas}
                  onChange={(e) => setFormResolver({ ...formResolver, notas: e.target.value })}
                />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleResolverGarantia}>Resolver</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL DELETE MASIVO */}
            {modalType === "deleteMasivo" && (
              <>
                <h3>¿Eliminar cuentas seleccionadas?</h3>
                <p className="modal-subtitle">
                  Se eliminarán {selectedCuentas.length} cuenta(s) con todos sus pagos y garantías. Esta acción no se puede deshacer.
                </p>
                <div className="modal-actions">
                  <button className="btn-danger" onClick={handleEliminarMasivo}>
                    Eliminar {selectedCuentas.length} cuenta(s)
                  </button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL PAGO MASIVO */}
            {modalType === "pagoMasivo" && (
              <>
                <h3>💳 Pago masivo</h3>
                <p className="modal-subtitle">{selectedCuentas.length} cuenta(s) seleccionada(s)</p>
                <input
                  type="number"
                  placeholder="Monto (COP) *"
                  value={formPagoMasivo.monto}
                  onChange={(e) => setFormPagoMasivo({ ...formPagoMasivo, monto: e.target.value })}
                  min="0"
                />
                <label>Divisa</label>
                <select value={formPagoMasivo.divisa} onChange={(e) => setFormPagoMasivo({ ...formPagoMasivo, divisa: e.target.value })}>
                  <option value="COP">COP — Peso colombiano</option>
                  <option value="USDT">USDT — Dólar</option>
                </select>
                <label>Fecha de pago</label>
                <input type="date" value={formPagoMasivo.fecha_pago} onChange={(e) => setFormPagoMasivo({ ...formPagoMasivo, fecha_pago: e.target.value })} />
                <select value={formPagoMasivo.estado} onChange={(e) => setFormPagoMasivo({ ...formPagoMasivo, estado: e.target.value })}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencido">Vencido</option>
                </select>
                <label>Método de pago</label>
                <select value={formPagoMasivo.metodo} onChange={(e) => { if (e.target.value === "__nuevo__") { setShowNuevoMetodo(true); } else { setFormPagoMasivo({ ...formPagoMasivo, metodo: e.target.value }); setShowNuevoMetodo(false); } }}>
                  {metodosPago.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                  <option value="__nuevo__">➕ Agregar método...</option>
                </select>
                {showNuevoMetodo && (
                  <div className="nueva-plataforma-row">
                    <input type="text" placeholder="Nombre del método" value={nuevoMetodo} onChange={(e) => setNuevoMetodo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAgregarMetodo()} autoFocus />
                    <button className="btn-agregar-plat" onClick={handleAgregarMetodo}>Agregar</button>
                  </div>
                )}
                <textarea placeholder="Notas (opcional)" value={formPagoMasivo.notas} onChange={(e) => setFormPagoMasivo({ ...formPagoMasivo, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handlePagoMasivo}>
                    Registrar {selectedCuentas.length} pago(s)
                  </button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL DELETE */}
            {modalType === "delete" && (
              <>
                <h3>¿Eliminar alquiler?</h3>
                <p className="modal-subtitle">
                  Se eliminará {selectedRental?.plataforma}
                  {selectedRental?.correo && ` (${selectedRental.correo})`} y todos sus pagos y
                  garantías. Esta acción no se puede deshacer.
                </p>
                <div className="modal-actions">
                  <button className="btn-danger" onClick={handleDeleteRental}>Eliminar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Rentals;
