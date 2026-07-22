import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import toast from "react-hot-toast";
import "./Inventory.css";

interface InventarioItem {
  id: number;
  correo: string;
  password: string;
  plataforma: string;
  proveedor?: string;
  correo_password?: string;
  correo_verificacion?: string;
  facturacion?: string;
  estado: "Disponible" | "Ocupada" | "Caída";
  alquiler_id?: number;
  notas?: string;
  cliente_nombre?: string;
  dias_restantes?: number;
}

const LIMIT = 50;

const DEFAULT_PLATAFORMAS = [
  "Netflix", "Max Platino", "Disney+", "Crunchyroll", "Prime Video",
  "Paramount+", "HBO Max", "Universal+", "Spotify", "YouTube Premium",
  "ChatGPT", "Canva", "CapCut", "Gemini", "VIX", "Amazon Prime"
];

function Inventory() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plataformaFilter, setPlataformaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [disponibles, setDisponibles] = useState<Record<string, number>>({});

  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkPlataforma, setBulkPlataforma] = useState("");
  const [bulkProveedor, setBulkProveedor] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // ── Plataformas dinámicas (compartidas con Alquileres) ─────────────────────
  const [plataformas, setPlataformas] = useState<string[]>(DEFAULT_PLATAFORMAS);
  const [showNuevaPlataforma, setShowNuevaPlataforma] = useState<null | "form" | "bulk">(null);
  const [nuevaPlataformaInput, setNuevaPlataformaInput] = useState("");

  const [formData, setFormData] = useState({
    correo: "",
    password: "",
    plataforma: "",
    proveedor: "",
    correo_password: "",
    correo_verificacion: "",
    facturacion: "",
    notas: "",
    estado: "Disponible" as "Disponible" | "Ocupada" | "Caída",
  });

  useEffect(() => {
    loadInventario(1);
    loadDisponiblesResumen();
    loadPlataformas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInventario(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plataformaFilter, estadoFilter]);

  const loadPlataformas = async () => {
    try {
      const data = await apiFetch("/api/alquileres/plataformas");
      if (Array.isArray(data) && data.length > 0) {
        setPlataformas(data.map((p: any) => p.nombre));
      }
    } catch {
      // se queda con la lista por defecto si falla
    }
  };

  const handleAgregarPlataforma = async () => {
    const nombre = nuevaPlataformaInput.trim();
    if (!nombre) return;
    try {
      await apiFetch("/api/alquileres/plataformas", {
        method: "POST",
        body: JSON.stringify({ nombre }),
      });
      toast.success(`Plataforma "${nombre}" agregada`);
      await loadPlataformas();
      if (showNuevaPlataforma === "form") {
        setFormData((f) => ({ ...f, plataforma: nombre }));
      } else if (showNuevaPlataforma === "bulk") {
        setBulkPlataforma(nombre);
      }
      setNuevaPlataformaInput("");
      setShowNuevaPlataforma(null);
    } catch (err: any) {
      toast.error(err.message || "Error agregando plataforma");
    }
  };

  const loadInventario = async (page: number, searchOverride?: string) => {
    setLoading(true);
    try {
      const search = searchOverride !== undefined ? searchOverride : searchText;
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (plataformaFilter) params.append("plataforma", plataformaFilter);
      if (estadoFilter) params.append("estado", estadoFilter);
      if (search) params.append("search", search);

      const data = await apiFetch("/api/admin/inventario?" + params.toString());
      setItems(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(page);
      setSelectedIds(new Set());
    } catch {
      toast.error("Error cargando inventario");
    } finally {
      setLoading(false);
    }
  };

  const loadDisponiblesResumen = async () => {
    try {
      const data = await apiFetch("/api/admin/inventario?page=1&limit=5000&estado=Disponible");
      const list: InventarioItem[] = data.data || [];
      const acc: Record<string, number> = {};
      list.forEach((item) => {
        acc[item.plataforma] = (acc[item.plataforma] || 0) + 1;
      });
      setDisponibles(acc);
    } catch {
      // silencioso, no bloquea la pagina
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      loadInventario(1, value);
    }, 400);
    setSearchTimer(timer);
  };

  const handleAddOrEdit = async () => {
    if (!formData.correo || !formData.password || !formData.plataforma) {
      toast.error("Campos requeridos: correo, contraseña, plataforma");
      return;
    }
    try {
      if (editingId) {
        await apiFetch("/api/admin/inventario/" + editingId, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast.success("Cuenta actualizada");
      } else {
        await apiFetch("/api/admin/inventario", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        toast.success("Cuenta agregada");
      }
      setShowForm(false);
      setEditingId(null);
      setShowPassword(false);
      setFormData({
        correo: "",
        password: "",
        plataforma: "",
        proveedor: "",
        correo_password: "",
        correo_verificacion: "",
        facturacion: "",
        notas: "",
        estado: "Disponible",
      });
      loadInventario(currentPage);
      loadDisponiblesResumen();
    } catch (err: any) {
      toast.error(err.message || "Error guardando cuenta");
    }
  };

  const handleEdit = (item: InventarioItem) => {
    setFormData({
      correo: item.correo,
      password: item.password,
      plataforma: item.plataforma,
      proveedor: item.proveedor || "",
      correo_password: item.correo_password || "",
      correo_verificacion: item.correo_verificacion || "",
      facturacion: item.facturacion || "",
      notas: item.notas || "",
      estado: item.estado,
    });
    setEditingId(item.id);
    setShowPassword(false);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar esta cuenta?")) return;
    try {
      await apiFetch("/api/admin/inventario/" + id, { method: "DELETE" });
      toast.success("Cuenta eliminada");
      loadInventario(currentPage);
      loadDisponiblesResumen();
    } catch {
      toast.error("Error eliminando cuenta");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async (field: string, value: string) => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos una cuenta");
      return;
    }
    try {
      await apiFetch("/api/admin/inventario/bulk/update", {
        method: "PUT",
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          field,
          value,
        }),
      });
      toast.success(selectedIds.size + " cuenta(s) actualizada(s)");
      setSelectedIds(new Set());
      loadInventario(currentPage);
    } catch {
      toast.error("Error en actualización masiva");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmMsg = "¿Eliminar " + selectedIds.size + " cuenta(s) del inventario? Esta acción no se puede deshacer.";
    if (!window.confirm(confirmMsg)) return;
    try {
      await apiFetch("/api/admin/inventario/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      toast.success(selectedIds.size + " cuenta(s) eliminada(s)");
      setSelectedIds(new Set());
      loadInventario(currentPage);
      loadDisponiblesResumen();
    } catch (err: any) {
      toast.error(err.message || "Error eliminando cuentas");
    }
  };

  const csvEscape = (val: any): string => {
    const str = val === null || val === undefined ? "" : String(val);
    const needsQuotes = str.indexOf(",") !== -1 || str.indexOf('"') !== -1 || str.indexOf("\n") !== -1;
    if (needsQuotes) {
      return '"' + str.split('"').join('""') + '"';
    }
    return str;
  };

  const handleExportCSV = async () => {
    try {
      toast.loading("Preparando exportación...", { id: "export" });
      const data = await apiFetch("/api/admin/inventario?page=1&limit=5000");
      const exportItems: InventarioItem[] = data.data || [];

      const headers = ["ID", "Correo", "Password", "Plataforma", "Proveedor", "Correo Password", "Correo Verificacion", "Facturacion", "Estado", "Cliente", "Notas"];
      const rowLines: string[] = [];
      for (const item of exportItems) {
        const cols = [
          item.id,
          item.correo,
          item.password,
          item.plataforma,
          item.proveedor || "",
          item.correo_password || "",
          item.correo_verificacion || "",
          item.facturacion || "",
          item.estado,
          item.cliente_nombre || "",
          item.notas || "",
        ];
        rowLines.push(cols.map(csvEscape).join(","));
      }

      const csvContent = [headers.join(","), ...rowLines].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fecha = new Date().toISOString().slice(0, 10);
      link.download = "inventario_cinebox_" + fecha + ".csv";
      link.click();
      URL.revokeObjectURL(url);
      toast.success(exportItems.length + " cuentas exportadas", { id: "export" });
    } catch {
      toast.error("Error exportando inventario", { id: "export" });
    }
  };

  const parseBulkText = () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    return lines.map((line) => {
      const cols = line.split("\t").map((c) => c.trim());
      return {
        correo: cols[0] || "",
        password: cols[1] || "",
        facturacion: cols[2] || "",
        correo_password: cols[3] || "",
        correo_verificacion: cols[4] || "",
      };
    });
  };

  const bulkPreview = bulkText.trim() ? parseBulkText() : [];

  const handleBulkCreate = async () => {
    if (!bulkPlataforma) {
      toast.error("Selecciona la plataforma");
      return;
    }
    const rows = parseBulkText();
    if (rows.length === 0) {
      toast.error("Pega al menos una fila");
      return;
    }
    setBulkSubmitting(true);
    try {
      const result = await apiFetch("/api/admin/inventario/bulk/create", {
        method: "POST",
        body: JSON.stringify({
          plataforma: bulkPlataforma,
          proveedor: bulkProveedor || null,
          rows,
        }),
      });
      toast.success(result.message || "Cuentas agregadas");
      if (result.errores && result.errores.length > 0) {
        result.errores.forEach((e: string) => toast.error(e));
      }
      setShowBulkForm(false);
      setBulkPlataforma("");
      setBulkProveedor("");
      setBulkText("");
      loadInventario(1);
      loadDisponiblesResumen();
    } catch (err: any) {
      toast.error(err.message || "Error en carga masiva");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    opacity: 0.6,
    marginBottom: "2px",
    marginTop: "8px",
    display: "block",
  };

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>📦 Inventario</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-primary" onClick={handleExportCSV}>
            📊 Exportar CSV
          </button>
          <button className="btn-primary" onClick={() => setShowBulkForm(true)}>
            📥 Carga masiva
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setShowPassword(false);
              setFormData({
                correo: "",
                password: "",
                plataforma: "",
                proveedor: "",
                correo_password: "",
                correo_verificacion: "",
                facturacion: "",
                notas: "",
                estado: "Disponible",
              });
            }}
          >
            ➕ Agregar cuenta
          </button>
        </div>
      </div>

      {Object.keys(disponibles).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.8rem" }}>
          {Object.entries(disponibles)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([plataforma, count]) => (
              <span
                key={plataforma}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  opacity: 0.85,
                }}
              >
                {plataforma}: <b>{count}</b> 🟢
              </span>
            ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? "Editar cuenta" : "Agregar cuenta"}</h2>

            <label style={fieldLabelStyle}>Correo</label>
            <input
              placeholder="Correo"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
            />

            <label style={fieldLabelStyle}>Contraseña</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? "Ocultar" : "Mostrar"}
                style={{ padding: "0 12px" }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            <label style={fieldLabelStyle}>Plataforma</label>
            <select
              value={formData.plataforma}
              onChange={(e) => {
                if (e.target.value === "__nueva__") {
                  setShowNuevaPlataforma("form");
                } else {
                  setFormData({ ...formData, plataforma: e.target.value });
                }
              }}
            >
              <option value="">Selecciona plataforma</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__nueva__">➕ Agregar nueva plataforma...</option>
            </select>
            {showNuevaPlataforma === "form" && (
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <input
                  type="text"
                  placeholder="Nombre de la nueva plataforma"
                  value={nuevaPlataformaInput}
                  onChange={(e) => setNuevaPlataformaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataforma()}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={handleAgregarPlataforma}>Agregar</button>
                <button type="button" onClick={() => { setShowNuevaPlataforma(null); setNuevaPlataformaInput(""); }}>✕</button>
              </div>
            )}

            <label style={fieldLabelStyle}>Proveedor</label>
            <input
              placeholder="Proveedor"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            />

            <label style={fieldLabelStyle}>Contraseña del correo</label>
            <input
              placeholder="Contraseña del correo"
              value={formData.correo_password}
              onChange={(e) => setFormData({ ...formData, correo_password: e.target.value })}
            />

            <label style={fieldLabelStyle}>Correo de verificación</label>
            <input
              placeholder="Correo de verificación"
              value={formData.correo_verificacion}
              onChange={(e) => setFormData({ ...formData, correo_verificacion: e.target.value })}
            />

            <label style={fieldLabelStyle}>Facturación</label>
            <input
              placeholder="Facturación (ej: Mensual, Anual)"
              value={formData.facturacion}
              onChange={(e) => setFormData({ ...formData, facturacion: e.target.value })}
            />

            {editingId && (
              <>
                <label style={fieldLabelStyle}>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.value as "Disponible" | "Ocupada" | "Caída" })
                  }
                >
                  <option value="Disponible">🟢 Disponible</option>
                  <option value="Ocupada">🔴 Ocupada</option>
                  <option value="Caída">🟡 Caída</option>
                </select>
                {formData.estado === "Disponible" && (
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
                    Al guardar como "Disponible", esta cuenta podrá asignarse a un nuevo cliente.
                  </p>
                )}
              </>
            )}

            <label style={fieldLabelStyle}>Notas</label>
            <textarea
              placeholder="Notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button onClick={handleAddOrEdit}>Guardar</button>
              <button onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showBulkForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "700px" }}>
            <h2>📥 Carga masiva de cuentas</h2>

            <label style={fieldLabelStyle}>Plataforma (para todo el lote)</label>
            <select
              value={bulkPlataforma}
              onChange={(e) => {
                if (e.target.value === "__nueva__") {
                  setShowNuevaPlataforma("bulk");
                } else {
                  setBulkPlataforma(e.target.value);
                }
              }}
            >
              <option value="">Selecciona plataforma</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__nueva__">➕ Agregar nueva plataforma...</option>
            </select>
            {showNuevaPlataforma === "bulk" && (
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <input
                  type="text"
                  placeholder="Nombre de la nueva plataforma"
                  value={nuevaPlataformaInput}
                  onChange={(e) => setNuevaPlataformaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataforma()}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={handleAgregarPlataforma}>Agregar</button>
                <button type="button" onClick={() => { setShowNuevaPlataforma(null); setNuevaPlataformaInput(""); }}>✕</button>
              </div>
            )}

            <label style={fieldLabelStyle}>Proveedor (para todo el lote, opcional)</label>
            <input
              placeholder="Proveedor"
              value={bulkProveedor}
              onChange={(e) => setBulkProveedor(e.target.value)}
            />

            <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "8px 0" }}>
              Pega las filas copiadas desde Excel/Sheets. Columnas en este orden, separadas por TAB:
              <br />
              <b>Correo | Contraseña | Facturación | Pass Correo | Correo Verificación</b>
            </p>

            <textarea
              placeholder={"TheobaldGrotz73@hotmail.com\tJac123123.\tBIN\t11usuario11\tcinebox.pnet@gmail.com\nKarynaEdris9164@hotmail.com\tJac123123\tBIN\t11usuario11\tcinebox.pnet@gmail.com"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
            />

            {bulkPreview.length > 0 && (
              <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                {bulkPreview.length} cuenta(s) detectada(s)
                {bulkPreview.some((r) => !r.correo || !r.password) && (
                  <span style={{ color: "#f87171" }}> — hay filas incompletas (sin correo o contraseña)</span>
                )}
              </p>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleBulkCreate} disabled={bulkSubmitting}>
                {bulkSubmitting ? "Agregando..." : "Agregar " + (bulkPreview.length || "") + " cuenta(s)"}
              </button>
              <button onClick={() => setShowBulkForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="inventory-filters">
        <select value={plataformaFilter} onChange={(e) => setPlataformaFilter(e.target.value)}>
          <option value="">Todas las plataformas</option>
          {plataformas.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Disponible">🟢 Disponible</option>
          <option value="Ocupada">🔴 Ocupada</option>
          <option value="Caída">🟡 Caída</option>
        </select>
        <input
          type="text"
          placeholder="Buscar correo..."
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedIds.size} seleccionada(s)</span>
          <input
            type="password"
            placeholder="Nueva contraseña"
            id="newPassword"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                const input = e.currentTarget as HTMLInputElement;
                if (input.value) handleBulkUpdate("password", input.value);
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById("newPassword") as HTMLInputElement;
              if (input.value) handleBulkUpdate("password", input.value);
            }}
          >
            Actualizar contraseña
          </button>
          <select
            onChange={(e) => {
              if (e.target.value) handleBulkUpdate("estado", e.target.value);
            }}
          >
            <option value="">Cambiar estado</option>
            <option value="Disponible">🟢 Disponible</option>
            <option value="Ocupada">🔴 Ocupada</option>
            <option value="Caída">🟡 Caída</option>
          </select>
          <button className="btn-eliminar-masivo-inv" onClick={handleBulkDelete}>
            🗑 Eliminar {selectedIds.size} seleccionada(s)
          </button>
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>Correo</th>
                  <th>Plataforma</th>
                  <th>Estado</th>
                  <th>Cliente</th>
                  <th>Proveedor</th>
                  <th>Facturación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                      />
                    </td>
                    <td>{item.correo}</td>
                    <td>{item.plataforma}</td>
                    <td>
                      {item.estado === "Disponible" && "🟢 Disponible"}
                      {item.estado === "Ocupada" && "🔴 Ocupada"}
                      {item.estado === "Caída" && "🟡 Caída"}
                    </td>
                    <td>
                      {item.estado === "Ocupada" && item.cliente_nombre ? (
                        <span style={{ fontSize: "0.8rem" }}>
                          👤 {item.cliente_nombre}
                          {item.dias_restantes !== undefined && item.dias_restantes !== null && (
                            <>
                              {" · "}
                              <span
                                style={{
                                  color:
                                    item.dias_restantes < 0
                                      ? "#f87171"
                                      : item.dias_restantes <= 3
                                      ? "#fbbf24"
                                      : "#4ade80",
                                  fontWeight: 600,
                                }}
                              >
                                {item.dias_restantes < 0
                                  ? "Vencido (" + Math.abs(item.dias_restantes) + "d)"
                                  : item.dias_restantes + "d"}
                              </span>
                            </>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{item.proveedor || "-"}</td>
                    <td>{item.facturacion || "-"}</td>
                    <td>
                      <button onClick={() => handleEdit(item)}>✎</button>
                      <button onClick={() => handleDelete(item.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button onClick={() => loadInventario(currentPage - 1)} disabled={currentPage === 1}>
              ← Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages} · {total} cuentas en total
            </span>
            <button onClick={() => loadInventario(currentPage + 1)} disabled={currentPage === totalPages}>
              Siguiente →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Inventory;