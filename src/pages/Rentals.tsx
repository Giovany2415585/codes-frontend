import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import "./Rentals.css";
import { apiFetch } from "../services/api";

interface Rental {
  id: number;
  user_id: number;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  plataforma: string;
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
  monto: number;
  fecha_pago: string;
  estado: string;
  metodo: string;
  notas: string;
}

interface Garantia {
  id: number;
  fecha_reporte: string;
  descripcion: string;
  cuenta_reemplazo: string;
  estado: "pendiente" | "resuelta";
  fecha_resolucion: string;
  notas: string;
}

const PLATAFORMAS = ["Netflix", "Disney+", "Max", "Paramount+", "Prime Video", "Crunchyroll", "Apple TV+", "Spotify", "YouTube Premium", "Otro"];

function Rentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [activeTab, setActiveTab] = useState<"pagos" | "garantias" | "historial">("pagos");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"crear" | "renovar" | "pago" | "garantia" | "resolver" | "delete" | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [searchText, setSearchText] = useState("");
  const [historial, setHistorial] = useState<Rental[]>([]);

  // Form states
  const [formRental, setFormRental] = useState({
    user_id: "",
    plataforma: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    precio: "",
    notas: "",
  });
  const [formDias, setFormDias] = useState("30");
  const [formPago, setFormPago] = useState({
    monto: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    estado: "pagado",
    metodo: "efectivo",
    notas: "",
  });
  const [formGarantia, setFormGarantia] = useState({
    fecha_reporte: new Date().toISOString().split("T")[0],
    descripcion: "",
    cuenta_reemplazo: "",
    notas: "",
  });
  const [formResolver, setFormResolver] = useState({
    cuenta_reemplazo: "",
    notas: "",
  });

  useEffect(() => {
    loadRentals();
    loadUsers();
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

  const handleSelectRental = async (rental: Rental) => {
    if (selectedRental?.id === rental.id) {
      setSelectedRental(null);
      setPagos([]);
      setGarantias([]);
      return;
    }
    setSelectedRental(rental);
    setActiveTab("pagos");
    try {
      const [pagosData, garantiasData] = await Promise.all([
        apiFetch(`/api/alquileres/${rental.id}/pagos`),
        apiFetch(`/api/alquileres/${rental.id}/garantias`),
      ]);
      setPagos(pagosData);
      setGarantias(garantiasData);
    } catch {
      toast.error("Error cargando detalles");
    }
  };

  const handleCreateRental = async () => {
    if (!formRental.user_id || !formRental.plataforma || !formRental.fecha_inicio || !formRental.fecha_fin) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    try {
      await apiFetch("/api/alquileres", {
        method: "POST",
        body: JSON.stringify({
          ...formRental,
          user_id: parseInt(formRental.user_id),
          precio: parseFloat(formRental.precio) || 0,
        }),
      });
      toast.success("Alquiler creado");
      setShowModal(false);
      setFormRental({ user_id: "", plataforma: "", fecha_inicio: new Date().toISOString().split("T")[0], fecha_fin: "", precio: "", notas: "" });
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || "Error creando alquiler");
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
      const data = await apiFetch(`/api/alquileres/${selectedRental.id}/pagos`);
      setPagos(data);
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
      const data = await apiFetch(`/api/alquileres/${selectedRental.id}/garantias`);
      setGarantias(data);
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
      if (selectedRental) {
        const data = await apiFetch(`/api/alquileres/${selectedRental.id}/garantias`);
        setGarantias(data);
      }
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
      setSelectedRental(null);
      loadRentals();
    } catch {
      toast.error("Error eliminando alquiler");
    }
  };

  const loadHistorial = async (userId: number) => {
    try {
      const data = await apiFetch(`/api/alquileres/cliente/${userId}`);
      setHistorial(data);
    } catch {
      toast.error("Error cargando historial");
    }
  };

  const getDiasColor = (dias: number) => {
    if (dias < 0) return "vencido";
    if (dias <= 3) return "urgente";
    if (dias <= 7) return "proximo";
    return "ok";
  };

  const filteredRentals = rentals.filter((r) => {
    const matchEstado = filterEstado === "todos" || r.estado === filterEstado;
    const matchSearch =
      r.cliente_nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.cliente_email?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.plataforma?.toLowerCase().includes(searchText.toLowerCase());
    return matchEstado && matchSearch;
  });

  const openModal = (type: typeof modalType, data?: any) => {
    setModalType(type);
    setModalData(data || null);
    setShowModal(true);
  };

  return (
    <div className="rentals-container">
      {/* ── HEADER ── */}
      <div className="rentals-header">
        <div className="rentals-header-left">
          <h2>Alquileres</h2>
          <div className="rentals-stats">
            <span className="stat-chip activo">{rentals.filter(r => r.estado === "activo").length} activos</span>
            <span className="stat-chip urgente">{rentals.filter(r => r.dias_restantes >= 0 && r.dias_restantes <= 3).length} por vencer</span>
            <span className="stat-chip pendiente">{rentals.filter(r => r.pago_estado === "pendiente").length} pago pendiente</span>
          </div>
        </div>
        <button className="btn-primary" onClick={() => openModal("crear")}>+ Nuevo alquiler</button>
      </div>

      {/* ── FILTROS ── */}
      <div className="rentals-filters">
        <input
          type="text"
          placeholder="Buscar cliente o plataforma..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="filter-input"
        />
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="filter-select">
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="vencido">Vencidos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* ── TABLA ── */}
      <div className="rentals-card">
        <div className="rentals-table-wrap">
          <table className="rentals-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plataforma</th>
                <th>Vence</th>
                <th>Días</th>
                <th>Precio</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.map((r) => (
                <tr
                  key={r.id}
                  className={`rental-row ${selectedRental?.id === r.id ? "selected" : ""}`}
                  onClick={() => handleSelectRental(r)}
                >
                  <td>
                    <div className="client-cell">
                      <span className="client-name">{r.cliente_nombre}</span>
                      <span className="client-email">{r.cliente_email}</span>
                    </div>
                  </td>
                  <td><span className="plataforma-badge">{r.plataforma}</span></td>
                  <td>{new Date(r.fecha_fin).toLocaleDateString("es-CO")}</td>
                  <td>
                    <span className={`dias-badge ${getDiasColor(r.dias_restantes)}`}>
                      {r.dias_restantes < 0 ? `${Math.abs(r.dias_restantes)}d vencido` : `${r.dias_restantes}d`}
                    </span>
                  </td>
                  <td>${Number(r.precio).toLocaleString("es-CO")}</td>
                  <td>
                    <span className={`pago-badge ${r.pago_estado || "sin-pago"}`}>
                      {r.pago_estado || "sin registro"}
                    </span>
                  </td>
                  <td><span className={`estado-badge ${r.estado}`}>{r.estado}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-btns">
                      <button className="btn-icon renovar" title="Renovar" onClick={() => { setSelectedRental(r); openModal("renovar"); }}>↻</button>
                      <button className="btn-icon pago" title="Registrar pago" onClick={() => { setSelectedRental(r); openModal("pago"); }}>💳</button>
                      <button className="btn-icon garantia" title="Garantía" onClick={() => { setSelectedRental(r); openModal("garantia"); }}>🛡️</button>
                      <button className="btn-icon delete" title="Eliminar" onClick={() => { setSelectedRental(r); openModal("delete"); }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRentals.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No hay alquileres</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PANEL DETALLE ── */}
        {selectedRental && (
          <div className="rental-detail">
            <div className="detail-header">
              <h3>{selectedRental.cliente_nombre} — {selectedRental.plataforma}</h3>
              <div className="detail-tabs">
                <button className={activeTab === "pagos" ? "active" : ""} onClick={() => setActiveTab("pagos")}>
                  💳 Pagos ({pagos.length})
                </button>
                <button className={activeTab === "garantias" ? "active" : ""} onClick={() => setActiveTab("garantias")}>
                  🛡️ Garantías ({garantias.length})
                </button>
                <button className={activeTab === "historial" ? "active" : ""} onClick={() => { setActiveTab("historial"); loadHistorial(selectedRental.user_id); }}>
                  📜 Historial
                </button>
              </div>
            </div>

            {activeTab === "pagos" && (
              <div className="detail-list">
                {pagos.length === 0 && <p className="empty-msg">Sin pagos registrados</p>}
                {pagos.map((p) => (
                  <div key={p.id} className="detail-item">
                    <span className={`pago-badge ${p.estado}`}>{p.estado}</span>
                    <span>${Number(p.monto).toLocaleString("es-CO")}</span>
                    <span>{new Date(p.fecha_pago).toLocaleDateString("es-CO")}</span>
                    <span className="metodo-tag">{p.metodo}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "garantias" && (
              <div className="detail-list">
                {garantias.length === 0 && <p className="empty-msg">Sin garantías registradas</p>}
                {garantias.map((g) => (
                  <div key={g.id} className="detail-item garantia-item">
                    <div className="garantia-info">
                      <span className={`garantia-estado ${g.estado}`}>{g.estado}</span>
                      <span className="garantia-desc">{g.descripcion}</span>
                      {g.cuenta_reemplazo && <span className="garantia-reemplazo">→ {g.cuenta_reemplazo}</span>}
                    </div>
                    {g.estado === "pendiente" && (
                      <button className="btn-resolver" onClick={() => openModal("resolver", g)}>Resolver</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "historial" && (
              <div className="detail-list">
                {historial.length === 0 && <p className="empty-msg">Sin historial</p>}
                {historial.map((h) => (
                  <div key={h.id} className="detail-item">
                    <span className="plataforma-badge">{h.plataforma}</span>
                    <span>{new Date(h.fecha_inicio).toLocaleDateString("es-CO")} → {new Date(h.fecha_fin).toLocaleDateString("es-CO")}</span>
                    <span className={`estado-badge ${h.estado}`}>{h.estado}</span>
                    <span>${Number(h.precio).toLocaleString("es-CO")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALES ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal rentals-modal" onClick={(e) => e.stopPropagation()}>

            {/* CREAR ALQUILER */}
            {modalType === "crear" && (
              <>
                <h3>Nuevo Alquiler</h3>
                <select value={formRental.user_id} onChange={(e) => setFormRental({ ...formRental, user_id: e.target.value })}>
                  <option value="">Seleccionar cliente *</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} — {u.email}</option>)}
                </select>
                <select value={formRental.plataforma} onChange={(e) => setFormRental({ ...formRental, plataforma: e.target.value })}>
                  <option value="">Seleccionar plataforma *</option>
                  {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <label>Fecha inicio *</label>
                <input type="date" value={formRental.fecha_inicio} onChange={(e) => setFormRental({ ...formRental, fecha_inicio: e.target.value })} />
                <label>Fecha fin *</label>
                <input type="date" value={formRental.fecha_fin} onChange={(e) => setFormRental({ ...formRental, fecha_fin: e.target.value })} />
                <input type="number" placeholder="Precio (COP)" value={formRental.precio} onChange={(e) => setFormRental({ ...formRental, precio: e.target.value })} />
                <textarea placeholder="Notas (opcional)" value={formRental.notas} onChange={(e) => setFormRental({ ...formRental, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleCreateRental}>Crear</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* RENOVAR */}
            {modalType === "renovar" && (
              <>
                <h3>Renovar Alquiler</h3>
                <p className="modal-subtitle">{selectedRental?.cliente_nombre} — {selectedRental?.plataforma}</p>
                <label>Días a extender</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} className={`dias-btn ${formDias === String(d) ? "active" : ""}`} onClick={() => setFormDias(String(d))}>{d}d</button>
                  ))}
                </div>
                <input type="number" value={formDias} onChange={(e) => setFormDias(e.target.value)} min="1" />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRenovar}>Renovar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* PAGO */}
            {modalType === "pago" && (
              <>
                <h3>Registrar Pago</h3>
                <input type="number" placeholder="Monto (COP) *" value={formPago.monto} onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })} />
                <label>Fecha de pago</label>
                <input type="date" value={formPago.fecha_pago} onChange={(e) => setFormPago({ ...formPago, fecha_pago: e.target.value })} />
                <select value={formPago.estado} onChange={(e) => setFormPago({ ...formPago, estado: e.target.value })}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencido">Vencido</option>
                </select>
                <select value={formPago.metodo} onChange={(e) => setFormPago({ ...formPago, metodo: e.target.value })}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                  <option value="otro">Otro</option>
                </select>
                <textarea placeholder="Notas (opcional)" value={formPago.notas} onChange={(e) => setFormPago({ ...formPago, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRegistrarPago}>Registrar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* GARANTÍA */}
            {modalType === "garantia" && (
              <>
                <h3>Registrar Garantía</h3>
                <label>Fecha de reporte</label>
                <input type="date" value={formGarantia.fecha_reporte} onChange={(e) => setFormGarantia({ ...formGarantia, fecha_reporte: e.target.value })} />
                <textarea placeholder="Descripción del problema *" value={formGarantia.descripcion} onChange={(e) => setFormGarantia({ ...formGarantia, descripcion: e.target.value })} />
                <input placeholder="Cuenta de reemplazo (opcional)" value={formGarantia.cuenta_reemplazo} onChange={(e) => setFormGarantia({ ...formGarantia, cuenta_reemplazo: e.target.value })} />
                <textarea placeholder="Notas (opcional)" value={formGarantia.notas} onChange={(e) => setFormGarantia({ ...formGarantia, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRegistrarGarantia}>Registrar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* RESOLVER GARANTÍA */}
            {modalType === "resolver" && (
              <>
                <h3>Resolver Garantía</h3>
                <p className="modal-subtitle">{modalData?.descripcion}</p>
                <input placeholder="Cuenta de reemplazo suministrada" value={formResolver.cuenta_reemplazo} onChange={(e) => setFormResolver({ ...formResolver, cuenta_reemplazo: e.target.value })} />
                <textarea placeholder="Notas de resolución" value={formResolver.notas} onChange={(e) => setFormResolver({ ...formResolver, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleResolverGarantia}>Resolver</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* ELIMINAR */}
            {modalType === "delete" && (
              <>
                <h3>¿Eliminar alquiler?</h3>
                <p className="modal-subtitle">Esta acción no se puede deshacer. Se eliminarán también los pagos y garantías asociados.</p>
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
