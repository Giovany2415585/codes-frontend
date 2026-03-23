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
  notas: string;
}

interface ClientGroup {
  user_id: number;
  cliente_nombre: string;
  cliente_email: string;
  rentals: Rental[];
}

const PLATAFORMAS = ["Netflix", "Disney+", "Max", "Paramount+", "Prime Video", "Crunchyroll", "Apple TV+", "Spotify", "YouTube Premium", "Otro"];

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function Rentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientGroup | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [activeTab, setActiveTab] = useState<"cuentas" | "pagos" | "garantias">("cuentas");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"crear" | "renovar" | "pago" | "garantia" | "resolver" | "delete" | null>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchText, setSearchText] = useState("");

  const [formRental, setFormRental] = useState({
    user_id: "",
    plataforma: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    dias: "30",
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
  const [formResolver, setFormResolver] = useState({ cuenta_reemplazo: "", notas: "" });

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

  const clientGroups: ClientGroup[] = [];
  rentals.forEach((r) => {
    const existing = clientGroups.find((g) => g.user_id === r.user_id);
    if (existing) {
      existing.rentals.push(r);
    } else {
      clientGroups.push({
        user_id: r.user_id,
        cliente_nombre: r.cliente_nombre,
        cliente_email: r.cliente_email,
        rentals: [r],
      });
    }
  });

  const filteredGroups = clientGroups.filter((g) => {
    const matchSearch =
      g.cliente_nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
      g.cliente_email?.toLowerCase().includes(searchText.toLowerCase());
    const matchEstado =
      filterEstado === "todos" ||
      g.rentals.some((r) =>
        filterEstado === "vencer"
          ? r.dias_restantes >= 0 && r.dias_restantes <= 3
          : r.estado === filterEstado
      );
    return matchSearch && matchEstado;
  });

  const getGroupStatus = (group: ClientGroup) => {
    const minDias = Math.min(...group.rentals.map((r) => r.dias_restantes));
    if (minDias < 0) return "vencido";
    if (minDias <= 3) return "vencer";
    return "activo";
  };

  const getMinVence = (group: ClientGroup) => {
    return group.rentals.reduce((a, b) => (a.dias_restantes < b.dias_restantes ? a : b));
  };

  const handleSelectClient = async (group: ClientGroup) => {
    if (selectedClient?.user_id === group.user_id) {
      setSelectedClient(null);
      return;
    }
    setSelectedClient(group);
    setActiveTab("cuentas");
    const allPagos: Pago[] = [];
    const allGarantias: Garantia[] = [];
    for (const r of group.rentals) {
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
    try {
      await apiFetch("/api/alquileres", {
        method: "POST",
        body: JSON.stringify({
          user_id: parseInt(formRental.user_id),
          plataforma: formRental.plataforma,
          fecha_inicio: formRental.fecha_inicio,
          fecha_fin,
          precio: parseFloat(formRental.precio) || 0,
          notas: formRental.notas,
        }),
      });
      toast.success("Alquiler creado");
      setShowModal(false);
      setFormRental({ user_id: "", plataforma: "", fecha_inicio: new Date().toISOString().split("T")[0], dias: "30", precio: "", notas: "" });
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
      if (selectedClient) {
        const updated = { ...selectedClient };
        setSelectedClient(updated);
      }
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
      if (selectedClient) handleSelectClient(selectedClient);
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
      if (selectedClient) handleSelectClient(selectedClient);
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
      if (selectedClient) handleSelectClient(selectedClient);
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
      setSelectedClient(null);
      loadRentals();
    } catch {
      toast.error("Error eliminando alquiler");
    }
  };

  const openModal = (type: typeof modalType, rental?: Rental, data?: any) => {
    setModalType(type);
    setSelectedRental(rental || null);
    setModalData(data || null);
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
        <button className="btn-primary" onClick={() => { setModalType("crear"); setShowModal(true); }}>
          + Nuevo alquiler
        </button>
      </div>

      <div className="rentals-filters">
        <input type="text" placeholder="Buscar cliente..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="filter-input" />
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
                <th>Cliente</th>
                <th>Cuentas</th>
                <th>Próx. vence</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => {
                const status = getGroupStatus(group);
                const minVence = getMinVence(group);
                const initials = group.cliente_nombre?.split(" ").map((w) => w[0]).join("").substring(0, 2) || "??";
                return (
                  <tr key={group.user_id} className={`rental-row ${selectedClient?.user_id === group.user_id ? "selected" : ""}`} onClick={() => handleSelectClient(group)}>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar">{initials}</div>
                        <div>
                          <span className="client-name">{group.cliente_nombre}</span>
                          <span className="client-email">{group.cliente_email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{group.rentals.length} cuenta{group.rentals.length > 1 ? "s" : ""}</td>
                    <td>
                      <div>
                        <span style={{ fontSize: "0.8rem" }}>{new Date(minVence.fecha_fin).toLocaleDateString("es-CO")}</span>
                        <br />
                        <span className={`dias-badge ${getDiasColor(minVence.dias_restantes)}`}>
                          {minVence.dias_restantes < 0 ? `${Math.abs(minVence.dias_restantes)}d vencido` : `${minVence.dias_restantes}d`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`estado-badge ${status === "vencer" ? "urgente" : status}`}>
                        {status === "vencer" ? "por vencer" : status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>Ver ▶</td>
                  </tr>
                );
              })}
              {filteredGroups.length === 0 && (
                <tr><td colSpan={5} className="empty-row">No hay clientes con alquileres</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedClient && (
          <div className="rental-detail">
            <div className="detail-header">
              <h3>{selectedClient.cliente_nombre}</h3>
              <div className="detail-tabs">
                <button className={activeTab === "cuentas" ? "active" : ""} onClick={() => setActiveTab("cuentas")}>📦 Cuentas ({selectedClient.rentals.length})</button>
                <button className={activeTab === "pagos" ? "active" : ""} onClick={() => setActiveTab("pagos")}>💳 Pagos ({pagos.length})</button>
                <button className={activeTab === "garantias" ? "active" : ""} onClick={() => setActiveTab("garantias")}>🛡️ Garantías ({garantias.length})</button>
              </div>
            </div>

            {activeTab === "cuentas" && (
              <div className="detail-list">
                {selectedClient.rentals.map((r) => (
                  <div key={r.id} className={`detail-item cuenta-item ${r.dias_restantes <= 3 ? "por-vencer" : ""}`}>
                    <div className="cuenta-info">
                      <span className="plataforma-badge">{r.plataforma}</span>
                      <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                        {new Date(r.fecha_inicio).toLocaleDateString("es-CO")} → {new Date(r.fecha_fin).toLocaleDateString("es-CO")}
                      </span>
                      <span className={`dias-badge ${getDiasColor(r.dias_restantes)}`}>
                        {r.dias_restantes < 0 ? `${Math.abs(r.dias_restantes)}d vencido` : `${r.dias_restantes}d restantes`}
                      </span>
                      <span className={`pago-badge ${r.pago_estado || "sin-pago"}`}>{r.pago_estado || "sin pago"}</span>
                      {r.precio > 0 && <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>${Number(r.precio).toLocaleString("es-CO")}</span>}
                    </div>
                    <div className="cuenta-actions">
                      <button className="btn-icon renovar" title="Renovar" onClick={() => openModal("renovar", r)}>↻</button>
                      <button className="btn-icon pago" title="Pago" onClick={() => openModal("pago", r)}>💳</button>
                      <button className="btn-icon garantia" title="Garantía" onClick={() => openModal("garantia", r)}>🛡️</button>
                      <button className="btn-icon delete" title="Eliminar" onClick={() => openModal("delete", r)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "pagos" && (
              <div className="detail-list">
                {pagos.length === 0 && <p className="empty-msg">Sin pagos registrados</p>}
                {pagos.map((p, i) => (
                  <div key={i} className="detail-item">
                    <span className={`pago-badge ${p.estado}`}>{p.estado}</span>
                    <span>${Number(p.monto).toLocaleString("es-CO")}</span>
                    <span style={{ fontSize: "0.8rem" }}>{new Date(p.fecha_pago).toLocaleDateString("es-CO")}</span>
                    <span className="metodo-tag">{p.metodo}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "garantias" && (
              <div className="detail-list">
                {garantias.length === 0 && <p className="empty-msg">Sin garantías registradas</p>}
                {garantias.map((g, i) => (
                  <div key={i} className="detail-item garantia-item">
                    <div className="garantia-info">
                      <span className={`garantia-estado ${g.estado}`}>{g.estado}</span>
                      <span className="garantia-desc">{g.descripcion}</span>
                      {g.cuenta_reemplazo && <span className="garantia-reemplazo">→ {g.cuenta_reemplazo}</span>}
                    </div>
                    {g.estado === "pendiente" && (
                      <button className="btn-resolver" onClick={() => openModal("resolver", undefined, g)}>Resolver</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal rentals-modal" onClick={(e) => e.stopPropagation()}>

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
                <label>Días asignados *</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} className={`dias-btn ${formRental.dias === String(d) ? "active" : ""}`} onClick={() => setFormRental({ ...formRental, dias: String(d) })}>{d}d</button>
                  ))}
                </div>
                <input type="number" placeholder="Días" value={formRental.dias} onChange={(e) => setFormRental({ ...formRental, dias: e.target.value })} min="1" />
                {formRental.fecha_inicio && formRental.dias && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Vence: {new Date(addDays(formRental.fecha_inicio, parseInt(formRental.dias) || 0)).toLocaleDateString("es-CO")}
                  </p>
                )}
                <input type="number" placeholder="Precio (COP)" value={formRental.precio} onChange={(e) => setFormRental({ ...formRental, precio: e.target.value })} />
                <textarea placeholder="Notas (opcional)" value={formRental.notas} onChange={(e) => setFormRental({ ...formRental, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleCreateRental}>Crear</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "renovar" && (
              <>
                <h3>Renovar cuenta</h3>
                <p className="modal-subtitle">{selectedRental?.plataforma} — vence {selectedRental && new Date(selectedRental.fecha_fin).toLocaleDateString("es-CO")}</p>
                <label>Días a extender</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} className={`dias-btn ${formDias === String(d) ? "active" : ""}`} onClick={() => setFormDias(String(d))}>{d}d</button>
                  ))}
                </div>
                <input type="number" value={formDias} onChange={(e) => setFormDias(e.target.value)} min="1" />
                {selectedRental && formDias && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Nueva fecha fin: {new Date(addDays(selectedRental.fecha_fin, parseInt(formDias) || 0)).toLocaleDateString("es-CO")}
                  </p>
                )}
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRenovar}>Renovar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "pago" && (
              <>
                <h3>Registrar Pago</h3>
                <p className="modal-subtitle">{selectedRental?.plataforma}</p>
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

            {modalType === "garantia" && (
              <>
                <h3>Registrar Garantía</h3>
                <p className="modal-subtitle">{selectedRental?.plataforma}</p>
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

            {modalType === "delete" && (
              <>
                <h3>¿Eliminar alquiler?</h3>
                <p className="modal-subtitle">Se eliminará {selectedRental?.plataforma} y todos sus pagos y garantías. Esta acción no se puede deshacer.</p>
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
