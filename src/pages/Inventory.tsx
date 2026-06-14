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

  const [formData, setFormData] = useState({
    correo: "",
    password: "",
    plataforma: "",
    proveedor: "",
    correo_password: "",
    correo_verificacion: "",
    facturacion: "",
    notas: "",
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
      setFormData({
        correo: "",
        password: "",
        plataforma: "",
        proveedor: "",
        correo_password: "",
        correo_verificacion: "",
        facturacion: "",
        notas: "",
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
  });
  setEditingId(item.id);
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

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>📦 Inventario</h1>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setFormData({ correo: "", password: "", plataforma: "", proveedor: "", correo_password: "", correo_verificacion: "", facturacion: "", notas: "" }); }}>
          ➕ Agregar cuenta
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? "Editar cuenta" : "Agregar cuenta"}</h2>
            <input
              placeholder="Correo"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <select
              value={formData.plataforma}
              onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
            >
              <option value="">Selecciona plataforma</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              placeholder="Proveedor"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            />
            <input
              placeholder="Contraseña del correo"
              value={formData.correo_password}
              onChange={(e) => setFormData({ ...formData, correo_password: e.target.value })}
            />
            <input
              placeholder="Correo de verificación"
              value={formData.correo_verificacion}
              onChange={(e) => setFormData({ ...formData, correo_verificacion: e.target.value })}
            />
            <input
              placeholder="Facturación (ej: Mensual, Anual)"
              value={formData.facturacion}
              onChange={(e) => setFormData({ ...formData, facturacion: e.target.value })}
            />
            <textarea
              placeholder="Notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAddOrEdit}>Guardar</button>
              <button onClick={() => setShowForm(false)}>Cancelar</button>
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
                <th>Proveedor</th>
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
                  <td>{item.proveedor || "-"}</td>
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
