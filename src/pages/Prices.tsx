import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import toast from "react-hot-toast";
import "./Prices.css";

interface Precio {
  id: number;
  producto: string;
  precio_cop: number;
  precio_usdt: number;
  tipo_cuenta?: string;
}

function Prices() {
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    producto: "",
    precio_cop: "",
    precio_usdt: "",
    tipo_cuenta: "",
  });

  useEffect(() => {
    loadPrecios();
  }, []);

  const loadPrecios = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/precios");
      setPrecios(data);
    } catch {
      toast.error("Error cargando precios");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEdit = async () => {
    if (!formData.producto || !formData.precio_cop || !formData.precio_usdt) {
      toast.error("Campos requeridos: producto, precio COP, precio USDT");
      return;
    }

    try {
      if (editingId) {
        await apiFetch(`/api/admin/precios/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            producto: formData.producto,
            precio_cop: parseFloat(formData.precio_cop),
            precio_usdt: parseFloat(formData.precio_usdt),
            tipo_cuenta: formData.tipo_cuenta || null,
          }),
        });
        toast.success("Producto actualizado");
      } else {
        await apiFetch("/api/admin/precios", {
          method: "POST",
          body: JSON.stringify({
            producto: formData.producto,
            precio_cop: parseFloat(formData.precio_cop),
            precio_usdt: parseFloat(formData.precio_usdt),
            tipo_cuenta: formData.tipo_cuenta || null,
          }),
        });
        toast.success("Producto agregado");
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ producto: "", precio_cop: "", precio_usdt: "", tipo_cuenta: "" });
      loadPrecios();
    } catch (err: any) {
      toast.error(err.message || "Error guardando producto");
    }
  };

  const handleEdit = (precio: Precio) => {
    setFormData({
      producto: precio.producto,
      precio_cop: precio.precio_cop.toString(),
      precio_usdt: precio.precio_usdt.toString(),
      tipo_cuenta: precio.tipo_cuenta || "",
    });
    setEditingId(precio.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar este producto?")) return;

    try {
      await apiFetch(`/api/admin/precios/${id}`, { method: "DELETE" });
      toast.success("Producto eliminado");
      loadPrecios();
    } catch {
      toast.error("Error eliminando producto");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(precios.map((p) => p.id)));
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

  const handleSendToTelegram = async (ids?: number[]) => {
    try {
      const body = ids && ids.length > 0 ? { ids } : {};
      await apiFetch("/api/admin/precios/send-telegram", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Precios enviados a Telegram");
      setSelectedIds(new Set());
    } catch {
      toast.error("Error enviando precios");
    }
  };

  const handleSendPaymentMethod = async (id: number, method: "binance" | "llave") => {
    try {
      const endpoint = method === "binance" ? "send-binance" : "send-llave";
      await apiFetch(`/api/admin/precios/${id}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(`Método de pago ${method === "binance" ? "Binance" : "LLAVE"} enviado a Telegram`);
    } catch {
      toast.error("Error enviando método de pago");
    }
  };

  return (
    <div className="prices-page">
      <div className="prices-header">
        <h1>💰 Precios</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ producto: "", precio_cop: "", precio_usdt: "", tipo_cuenta: "" });
          }}
        >
          ➕ Agregar producto
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? "Editar producto" : "Agregar producto"}</h2>
            <input
              placeholder="Nombre del producto"
              value={formData.producto}
              onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
            />
            <input
              type="number"
              placeholder="Precio COP"
              value={formData.precio_cop}
              onChange={(e) => setFormData({ ...formData, precio_cop: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Precio USDT"
              value={formData.precio_usdt}
              onChange={(e) => setFormData({ ...formData, precio_usdt: e.target.value })}
            />
            <input
              placeholder="Tipo de cuenta (ej: Completa, Perfil)"
              value={formData.tipo_cuenta}
              onChange={(e) => setFormData({ ...formData, tipo_cuenta: e.target.value })}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAddOrEdit}>Guardar</button>
              <button onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="prices-actions">
        <button className="btn-telegram" onClick={() => handleSendToTelegram()}>
          📢 Enviar todos los precios
        </button>
        {selectedIds.size > 0 && (
          <button className="btn-telegram" onClick={() => handleSendToTelegram(Array.from(selectedIds))}>
            📢 Enviar {selectedIds.size} seleccionado(s)
          </button>
        )}
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="prices-table-wrapper">
          <table className="prices-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === precios.length && precios.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Producto</th>
                <th>Precio COP</th>
                <th>Precio USDT</th>
                <th>Tipo de cuenta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {precios.map((precio) => (
                <tr key={precio.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(precio.id)}
                      onChange={(e) => handleSelectOne(precio.id, e.target.checked)}
                    />
                  </td>
                  <td>{precio.producto}</td>
                  <td>${precio.precio_cop.toLocaleString("es-CO")}</td>
                  <td>${precio.precio_usdt}</td>
                  <td>{precio.tipo_cuenta || "-"}</td>
                  <td style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => handleEdit(precio)} title="Editar">
                      ✎
                    </button>
                    <button onClick={() => handleDelete(precio.id)} title="Eliminar">
                      ✕
                    </button>
                    <button
                      className="btn-binance"
                      onClick={() => handleSendPaymentMethod(precio.id, "binance")}
                      title="Enviar método Binance"
                    >
                      🟨
                    </button>
                    <button
                      className="btn-llave"
                      onClick={() => handleSendPaymentMethod(precio.id, "llave")}
                      title="Enviar método LLAVE"
                    >
                      🟣
                    </button>
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

export default Prices;