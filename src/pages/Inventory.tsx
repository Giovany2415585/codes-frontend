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

function Inventory() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [plataformaFilter, setPlataformaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkPlataforma, setBulkPlataforma] = useState("");
  const [bulkProveedor, setBulkProveedor] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

  const plataformas = [
    "Netflix", "Max Platino", "Disney+", "Crunchyroll", "Prime Video",
    "Paramount+", "HBO Max", "Universal+", "Spotify", "YouTube Premium",
    "ChatGPT", "Canva", "CapCut", "Gemini", "VIX", "Amazon Prime"
  ];

  useEffect(() => {
    loadInventario();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, plataformaFilter, estadoFilter, searchText]);

  const loadInventario = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/inventario");
      setItems(data);
    } catch {
      toast.error("Error cargando inventario");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = items;

    if (plataformaFilter) {
      filtered = filtered.filter((item) => item.plataforma === plataformaFilter);
    }
    if (estadoFilter) {
      filtered = filtered.filter((item) => item.estado === estadoFilter);
    }
    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.correo.includes(searchText.toLowerCase()) ||
          (item.notas?.includes(searchText) || false)
      );
    }

    setFilteredItems(filtered);
  };

  // Conteo de cuentas DISPONIBLES por plataforma (solo plataformas con stock)
  const disponiblesPorPlataforma = items
    .filter((item) => item.estado === "Disponible")
    .reduce((acc: Record<string, number>, item) => {
      acc[item.plataforma] = (acc[item.plataforma] || 0) + 1;
      return acc;
    }, {});

  const handleAddOrEdit = async () => {
    if (!formData.correo || !formData.password || !formData.plataforma) {
      toast.error("Campos requeridos: correo, contraseña, plataforma");
      return;
    }

    try {
      if (editingId) {
        await apiFetch(`/api/admin/inventario/${editingId}`, {
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
      loadInventario();
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
      await apiFetch(`/api/admin/inventario/${id}`, { method: "DELETE" });
      toast.success("Cuenta eliminada");
      loadInventario();
    } catch {
      toast.error("Error eliminando cuenta");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
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
      toast.success(`${selectedIds.size} cuenta(s) actualizada(s)`);
      setSelectedIds(new Set());
      loadInventario();
    } catch {
      toast.error("Error en actualización masiva");
    }
  };

  // ── NUEVO: eliminar masivo ────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.size} cuenta(s) del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch("/api/admin/inventario/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      toast.success(`${selectedIds.size} cuenta(s) eliminada(s)`);
      setSelectedIds(new Set());
      loadInventario();
    } catch (err: any) {
      toast.error(err.message || "Error eliminando cuentas");
    }
  };

  // Parsea el texto pegado (filas tipo Excel, separadas por TAB)
  // Orden esperado: correo | password | facturacion | correo_password | correo_verificacion
  const parseBulkText = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

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
      loadInventario();
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
          <button className="btn-primary" onClick={() => setShowBulkForm(true)}>
            📥 Carga masiva
          </button>
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setShowPassword(false); setFormData({ correo: "", password: "", plataforma: "", proveedor: "", correo_password: "", correo_verificacion: "", facturacion: "", notas: "", estado: "Disponible" }); }}>
            ➕ Agregar cuenta
          </button>
        </div>
      </div>

      {/* Resumen de disponibilidad por plataforma */}
      {Object.keys(disponiblesPorPlataforma).length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "0.8rem",
          }}
        >
          {Object.entries(disponiblesPorPlataforma)
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
              onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
            >
              <option value="">Selecciona plataforma</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

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
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as "Disponible" | "Ocupada" | "Caída" })}
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
              onChange={(e) => setBulkPlataforma(e.target.value)}
            >
              <option value="">Selecciona plataforma</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

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
                {bulkSubmitting ? "Agregando..." : `Agregar ${bulkPreview.length || ""} cuenta(s)`}
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
          onChange={(e) => setSearchText(e.target.value.toLowerCase())}
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
          <button onClick={() => {
            const input = document.getElementById("newPassword") as HTMLInputElement;
            if (input.value) handleBulkUpdate("password", input.value);
          }}>
            Actualizar contraseña
          </button>
          <select onChange={(e) => {
            if (e.target.value) handleBulkUpdate("estado", e.target.value);
          }}>
            <option value="">Cambiar estado</option>
            <option value="Disponible">🟢 Disponible</option>
            <option value="Ocupada">🔴 Ocupada</option>
            <option value="Caída">🟡 Caída</option>
          </select>
          {/* ── NUEVO: botón eliminar masivo ── */}
          <button className="btn-eliminar-masivo-inv" onClick={handleBulkDelete}>
            🗑 Eliminar {selectedIds.size} seleccionada(s)
          </button>
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
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
              {filteredItems.map((item) => (
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
                            <span style={{
                              color: item.dias_restantes < 0 ? "#f87171" : item.dias_restantes <= 3 ? "#fbbf24" : "#4ade80",
                              fontWeight: 600,
                            }}>
                              {item.dias_restantes < 0
                                ? `Vencido (${Math.abs(item.dias_restantes)}d)`
                                : `${item.dias_restantes}d`}
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
      )}
    </div>
  );
}

export default Inventory;