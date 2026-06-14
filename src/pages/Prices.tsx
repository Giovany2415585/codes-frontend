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
  descripcion?: string;
}

interface MetodoPago {
  id: number;
  tipo: string;
  mensaje: string;
}

function Prices() {
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [editingMetodo, setEditingMetodo] = useState<MetodoPago | null>(null);
  const [metodoMensaje, setMetodoMensaje] = useState("");

  const [formData, setFormData] = useState({
    producto: "",
    precio_cop: "",
    precio_usdt: "",
    tipo_cuenta: "",
    descripcion: "",
  });

  useEffect(() => {
    loadPrecios();
    loadMetodos();
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

  const loadMetodos = async () => {
    try {
      const data = await apiFetch("/api/admin/precios/metodos-pago");
      setMetodos(data);
    } catch {
      toast.error("Error cargando métodos de pago");
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
            descripcion: formData.descripcion || null,
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
            descripcion: formData.descripcion || null,
          }),
        });
        toast.success("Producto agregado");
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ producto: "", precio_cop: "", precio_usdt: "", tipo_cuenta: "", descripcion: "" });
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
      descripcion: precio.descripcion || "",
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

  const handleOpenEditMetodo = (metodo: MetodoPago) => {
    setEditingMetodo(metodo);
    setMetodoMensaje(metodo.mensaje);
  };

  const handleSaveMetodo = async () => {
    if (!editingMetodo) return;
    try {
      await apiFetch(`/api/admin/precios/metodos-pago/${editingMetodo.tipo}`, {
        method: "PUT",
        body: JSON.stringify({ mensaje: metodoMensaje }),
      });
      toast.success("Método de pago actualizado");
      setEditingMetodo(null);
      loadMetodos();
    } catch {
      toast.error("Error actualizando método de pago");
    }
  };

  const handleSendMetodo = async (tipo: string) => {
    try {
      await apiFetch(`/api/admin/precios/metodos-pago/${tipo}/send`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(`Método ${tipo === "binance" ? "Binance" : "LLAVE"} enviado a Telegram`);
    } catch {
      toast.error("Error enviando método de pago");
    }
  };

  const formatCOP = (value: number) => `$${Math.round(Number(value)).toLocaleString("es-CO")}`;

  const metodoBinance = metodos.find((m) => m.tipo === "binance");
  const metodoLlave = metodos.find((m) => m.tipo === "llave");

  return (
    <div className="prices-page">
      <div className="prices-header">
        <h1>💰 Precios</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ producto: "", precio_cop: "", precio_usdt: "", tipo_cuenta: "", descripcion: "" });
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
            <textarea
              placeholder={"Descripción / detalles del producto (ej:\n🔘 PROVEEDOR NUPLIN😎\n🔘 CUENTAS 100% ORIGINALES NO CAEN✅\n🔘 A DOMINIO\n🔘 4 DISPOSITIVOS SIMULTÁNEOS.📶\n🔘 NUEVAS O RENOVACION💻\n🔘 DURAN 30D NI MAS NI MENOS)"}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={6}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAddOrEdit}>Guardar</button>
              <button onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {editingMetodo && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Editar método de pago — {editingMetodo.tipo === "binance" ? "Binance" : "LLAVE BRE-B"}</h2>
            <textarea
              value={metodoMensaje}
              onChange={(e) => setMetodoMensaje(e.target.value)}
              rows={10}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSaveMetodo}>Guardar</button>
              <button onClick={() => setEditingMetodo(null)}>Cancelar</button>
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

      {/* AJUSTE 3 — Métodos de pago globales editables */}
      <div className="prices-actions">
        {metodoBinance && (
          <>
            <button className="btn-telegram btn-binance" onClick={() => handleSendMetodo("binance")}>
              🟨 Enviar método Binance
            </button>
            <button className="btn-telegram" onClick={() => handleOpenEditMetodo(metodoBinance)}>
              ✎ Editar Binance
            </button>
          </>
        )}
        {metodoLlave && (
          <>
            <button className="btn-telegram btn-llave" onClick={() => handleSendMetodo("llave")}>
              🟣 Enviar método LLAVE
            </button>
            <button className="btn-telegram" onClick={() => handleOpenEditMetodo(metodoLlave)}>
              ✎ Editar LLAVE
            </button>
          </>
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
                <th>Descripción</th>
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
                  <td>{formatCOP(precio.precio_cop)}</td>
                  <td>${precio.precio_usdt}</td>
                  <td>{precio.tipo_cuenta || "-"}</td>
                  <td style={{ whiteSpace: "pre-line", maxWidth: "300px" }}>{precio.descripcion || "-"}</td>
                  <td style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => handleEdit(precio)} title="Editar">
                      ✎
                    </button>
                    <button onClick={() => handleDelete(precio.id)} title="Eliminar">
                      ✕
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