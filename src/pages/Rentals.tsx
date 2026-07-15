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
  divisa: string;
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

interface InventarioCuenta {
  id: number;
  correo: string;
  password: string;
  plataforma: string;
  proveedor?: string;
  estado: string;
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
    "crear" | "editar" | "renovar" | "renovarMasivo" | "pagoMasivo" | "deleteMasivo" | "garantia" | "resolver" | "delete" | "cortar" | null
  >(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchText, setSearchText] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [selectedCuentas, setSelectedCuentas] = useState<number[]>([]);
  const [enviandoResumen, setEnviandoResumen] = useState(false);

  const [correosDisponibles, setCorreosDisponibles] = useState<string[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkCorreos, setBulkCorreos] = useState<{correo: string, password: string | null}[]>([]);

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
  const [formRenovar, setFormRenovar] = useState({ precio: "", divisa: "COP" });
  const [formRenovarMasivo, setFormRenovarMasivo] = useState({ dias: "30", precio: "", divisa: "COP" });
  const [formPagoMasivo, setFormPagoMasivo] = useState({
    monto: "",
    divisa: "COP",
    fecha_pago: new Date().toISOString().split("T")[0],
    estado: "pagado",
    metodo: "",
    notas: "",
  });
  const [formGarantia, setFormGarantia] = useState({
    correo_nuevo: "",
    password_nuevo: "",
    notas: "",
  });
  const [formResolver, setFormResolver] = useState({ cuenta_reemplazo: "", notas: "" });

  // ── Opciones al eliminar (individual o masivo): estado del inventario + nueva contraseña ──
  const [formDeleteOptions, setFormDeleteOptions] = useState({
    estado_inventario: "Disponible" as "Disponible" | "Caída",
    new_password: "",
  });

  // ── Inventario para Garantía ────────────────────────────────────────────────
  const [usarInventarioGarantia, setUsarInventarioGarantia] = useState(false);
  const [cuentasInventarioGarantia, setCuentasInventarioGarantia] = useState<InventarioCuenta[]>([]);
  const [inventarioSeleccionadoGarantia, setInventarioSeleccionadoGarantia] = useState<number | "">("");
  const [loadingInventarioGarantia, setLoadingInventarioGarantia] = useState(false);

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
      await apiFetch("/api/alquileres/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({
          ids: selectedCuentas,
          estado_inventario: formDeleteOptions.estado_inventario,
          new_password: formDeleteOptions.new_password || undefined,
        }),
      });
      toast.success(`${selectedCuentas.length} cuenta(s) eliminada(s)`);
      setShowModal(false);
      setSelectedCuentas([]);
      setFormDeleteOptions({ estado_inventario: "Disponible", new_password: "" });
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
      .split(/[\n]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes("@"))
      .map((line) => {
        const parts = line.split(/\t|;|  +/).map(p => p.trim()).filter(Boolean);
        const correo = parts[0]?.toLowerCase() || "";
        const password = parts[1] || null;
        return { correo, password };
      })
      .filter((item) => item.correo.includes("@") && item.correo.includes("."));
    const seen = new Set();
    const unique = parsed.filter(item => {
      if (seen.has(item.correo)) return false;
      seen.add(item.correo);
      return true;
    });
    setBulkCorreos(unique);
  };

  const removeBulkCorreo = (correo: string) => {
    setBulkCorreos((prev) => prev.filter((c) => c.correo !== correo));
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

  const handleEnviarResumen = async (userId: number) => {
    setEnviandoResumen(true);
    try {
      await apiFetch(`/api/alquileres/resumen-telegram/${userId}`, { method: "POST" });
      toast.success("📋 Resumen enviado a Telegram");
    } catch (err: any) {
      toast.error(err.message || "Error enviando resumen");
    } finally {
      setEnviandoResumen(false);
    }
  };

  const sortedRentals = [...rentals].sort((a, b) =>
    new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime()
  );

  const flatRows = sortedRentals.filter((r) => {
    const matchSearch =
      r.cliente_nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.cliente_email?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.plataforma?.toLowerCase().includes(searchText.toLowerCase()) ||
      (r.correo || "").toLowerCase().includes(searchText.toLowerCase());
    const matchEstado =
      filterEstado === "todos" ||
      (filterEstado === "vencer" ? r.dias_restantes >= 0 && r.dias_restantes <= 3 :
       filterEstado === "vencido" ? r.dias_restantes < 0 :
       r.estado === filterEstado);
    const matchCliente =
      filterCliente === "" || r.user_id === parseInt(filterCliente);
    return matchSearch && matchEstado && matchCliente;
  });

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
    try {
      const freshRentals: Rental[] = await apiFetch("/api/alquileres");
      const clientRentalsLocal = freshRentals.filter((r) => r.user_id === userId);
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
      setRentals(freshRentals);
      setPagos(allPagos);
      setGarantias(allGarantias);
    } catch {}
  };

  const handleCreateRental = async () => {
    if (!formRental.user_id || !formRental.plataforma || !formRental.fecha_inicio || !formRental.dias) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    const fecha_fin = addDays(formRental.fecha_inicio, parseInt(formRental.dias));
    const correosParaCrear = bulkCorreos.length > 0 ? bulkCorreos : [{ correo: formRental.correo || null, password: null }];

    try {
      if (correosParaCrear.length > 1) {
        await apiFetch("/api/alquileres/bulk", {
          method: "POST",
          body: JSON.stringify({
            user_id: parseInt(formRental.user_id),
            plataforma: formRental.plataforma,
            correos: correosParaCrear,
            fecha_inicio: formRental.fecha_inicio,
            fecha_fin,
            precio: parseFloat(formRental.precio) || 0,
            divisa: formRental.divisa || "COP",
            notas: formRental.notas,
          }),
        });
      } else {
        await apiFetch("/api/alquileres", {
          method: "POST",
          body: JSON.stringify({
            user_id: parseInt(formRental.user_id),
            plataforma: formRental.plataforma,
            correo: correosParaCrear[0].correo || null,
            password: correosParaCrear[0].password || null,
            fecha_inicio: formRental.fecha_inicio,
            fecha_fin,
            precio: parseFloat(formRental.precio) || 0,
            divisa: formRental.divisa || "COP",
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
      await loadRentals();
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
          divisa: formEditar.divisa || "COP",
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
      const body: any = { dias: parseInt(formDias) };
      if (formRenovar.precio) body.precio = parseFloat(formRenovar.precio);
      if (formRenovar.divisa) body.divisa = formRenovar.divisa;
      await apiFetch(`/api/alquileres/${selectedRental.id}/renovar`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      toast.success(`Renovado por ${formDias} días`);
      setShowModal(false);
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || "Error renovando");
    }
  };

  const handleRenovarMasivo = async () => {
    if (selectedCuentas.length === 0) return;
    const dias = parseInt(formRenovarMasivo.dias);
    if (!dias || dias <= 0) {
      toast.error("Los días son obligatorios");
      return;
    }
    try {
      const body: any = { ids: selectedCuentas, dias };
      if (formRenovarMasivo.precio) body.precio = parseFloat(formRenovarMasivo.precio);
      if (formRenovarMasivo.divisa) body.divisa = formRenovarMasivo.divisa;

      await apiFetch(`/api/alquileres/renovar-masivo`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      toast.success(`${selectedCuentas.length} cuenta(s) renovada(s) por ${dias} días`);

      setShowModal(false);
      setSelectedCuentas([]);
      setFormRenovarMasivo({ dias: "30", precio: "", divisa: "COP" });
      if (selectedClient) refreshClientDetail(selectedClient);
      loadRentals();
    } catch (err: any) {
      toast.error(err.message || "Error renovando cuentas");
    }
  };

  const handleEditarPago = async (pagoId: number, nuevoEstado: string) => {
    try {
      await apiFetch(`/api/alquileres/pagos/${pagoId}`, {
        method: "PUT",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      toast.success("Pago actualizado");
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error actualizando pago");
    }
  };

  const handleToggleUsarInventarioGarantia = async () => {
    const next = !usarInventarioGarantia;
    setUsarInventarioGarantia(next);
    setInventarioSeleccionadoGarantia("");
    if (next && selectedRental?.plataforma) {
      setLoadingInventarioGarantia(true);
      try {
        const cuentas = await apiFetch(`/api/admin/inventario/disponibles/${encodeURIComponent(selectedRental.plataforma)}`);
        setCuentasInventarioGarantia(cuentas);
      } catch {
        setCuentasInventarioGarantia([]);
        toast.error("Error cargando cuentas del inventario");
      } finally {
        setLoadingInventarioGarantia(false);
      }
    } else {
      setCuentasInventarioGarantia([]);
    }
  };

  const handleRegistrarGarantia = async () => {
    if (!selectedRental) return;

    if (usarInventarioGarantia) {
      if (!inventarioSeleccionadoGarantia) {
        toast.error("Selecciona una cuenta del inventario");
        return;
      }
    } else if (!formGarantia.correo_nuevo?.trim()) {
      toast.error("Ingresa el correo de reemplazo");
      return;
    }

    try {
      await apiFetch(`/api/alquileres/${selectedRental.id}/garantias`, {
        method: "POST",
        body: JSON.stringify(
          usarInventarioGarantia
            ? {
                inventario_id: inventarioSeleccionadoGarantia,
                notas: formGarantia.notas,
              }
            : {
                correo_nuevo: formGarantia.correo_nuevo,
                password_nuevo: formGarantia.password_nuevo || null,
                notas: formGarantia.notas,
              }
        ),
      });
      toast.success("✅ Garantía aplicada — correo reemplazado");
      setShowModal(false);
      await loadRentals();
      if (selectedClient) refreshClientDetail(selectedClient);
    } catch (err: any) {
      toast.error(err.message || "Error aplicando garantía");
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
      await apiFetch(`/api/alquileres/${selectedRental.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          estado_inventario: formDeleteOptions.estado_inventario,
          new_password: formDeleteOptions.new_password || undefined,
        }),
      });
      toast.success("Alquiler eliminado");
      setShowModal(false);
      setFormDeleteOptions({ estado_inventario: "Disponible", new_password: "" });
      await loadRentals();
      const remaining = rentals.filter(
        (r) => r.user_id === selectedClient && r.id !== selectedRental.id
      );
      if (remaining.length === 0) setSelectedClient(null);
    } catch {
      toast.error("Error eliminando alquiler");
    }
  };

  const handleCortarAlquiler = async (estadoInventario: "Caída" | "Disponible") => {
    if (!selectedRental) return;
    try {
      await apiFetch(`/api/alquileres/${selectedRental.id}?estado_inventario=${encodeURIComponent(estadoInventario)}`, {
        method: "DELETE",
      });
      toast.success(
        estadoInventario === "Caída"
          ? "✂️ Alquiler cortado — cuenta marcada como Caída"
          : "✂️ Alquiler cortado — cuenta liberada (Disponible)"
      );
      setShowModal(false);
      await loadRentals();
      const remaining = rentals.filter(
        (r) => r.user_id === selectedClient && r.id !== selectedRental.id
      );
      if (remaining.length === 0) setSelectedClient(null);
    } catch {
      toast.error("Error cortando el alquiler");
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
        divisa: (rental as any).divisa || "COP",
        estado: rental.estado,
        notas: rental.notas || "",
      });
      loadCorreos(String(rental.user_id));
    }

    if (type === "renovar") { setFormDias("30"); setFormRenovar({ precio: String(rental?.precio || ""), divisa: (rental as any)?.divisa || "COP" }); }
    if (type === "garantia") {
      setFormGarantia({ correo_nuevo: "", password_nuevo: "", notas: "" });
      setUsarInventarioGarantia(false);
      setCuentasInventarioGarantia([]);
      setInventarioSeleccionadoGarantia("");
    }
    if (type === "resolver") setFormResolver({ cuenta_reemplazo: "", notas: "" });
    if (type === "delete" || type === "deleteMasivo") {
      setFormDeleteOptions({ estado_inventario: "Disponible", new_password: "" });
    }

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
  const totalVencidos = rentals.filter((r) => r.dias_restantes < 0).length;
  const totalPendiente = rentals.filter((r) => r.pago_estado === "pendiente").length;

  return (
    <div className="rentals-container">
      <div className="rentals-header">
        <div className="rentals-header-left">
          <h2>Alquileres</h2>
          <div className="rentals-stats">
            <span className="stat-chip activo">{totalActivos} activos</span>
            <span className="stat-chip urgente">{totalVencer} por vencer</span>
            {totalVencidos > 0 && (
              <span
                className="stat-chip vencido"
                style={{ cursor: "pointer" }}
                onClick={() => setFilterEstado("vencido")}
                title="Ver alquileres vencidos (clic para filtrar)"
              >
                ✂️ {totalVencidos} vencido{totalVencidos > 1 ? "s" : ""} — pendiente de corte
              </span>
            )}
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleEnviarResumen(selectedClient)}
                  disabled={enviandoResumen}
                  title="Enviar resumen del cliente a Telegram"
                  style={{
                    background: "linear-gradient(135deg, #229ED9, #1a7fad)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: enviandoResumen ? "not-allowed" : "pointer",
                    opacity: enviandoResumen ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {enviandoResumen ? "Enviando..." : "📋 Resumen"}
                </button>
                <div className="detail-tabs">
                  <button className={activeTab === "cuentas" ? "active" : ""} onClick={() => setActiveTab("cuentas")}>
                    📦 Cuentas ({clientRentals.length})
                  </button>
                  <button className={activeTab === "pagos" ? "active" : ""} onClick={() => setActiveTab("pagos")}>
                    💳 Pagos ({pagos.length})
                  </button>
                  <button className={activeTab === "garantias" ? "active" : ""} onClick={() => setActiveTab("garantias")}>
                    🛡️ Garantías ({garantias.length})
                  </button>
                </div>
              </div>
            </div>

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
                      <button className="btn-renovar-masivo" onClick={() => { setModalType("renovarMasivo"); setShowModal(true); }}>
                        ↻ Renovar {selectedCuentas.length} seleccionada(s)
                      </button>
                      <button className="btn-eliminar-masivo" onClick={() => openModal("deleteMasivo")}>
                        🗑 Eliminar {selectedCuentas.length} seleccionada(s)
                      </button>
                    </div>
                  )}
                </div>

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
                                  {r.precio > 0 && (
                                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                                      ${Number(r.precio).toLocaleString("es-CO")} {r.divisa || "COP"}
                                    </span>
                                  )}
                                </div>
                                <div className="cuenta-actions">
                                  <button className="btn-icon editar" title="Editar" onClick={(e) => { e.stopPropagation(); openModal("editar", r); }}>✏️</button>
                                  <button className="btn-icon renovar" title="Renovar" onClick={(e) => { e.stopPropagation(); openModal("renovar", r); }}>↻</button>
                                  <button className="btn-icon garantia" title="Garantía" onClick={(e) => { e.stopPropagation(); openModal("garantia", r); }}>🛡️</button>
                                  {r.dias_restantes < 0 && (
                                    <button className="btn-icon cortar" title="Cortar (vencido)" onClick={(e) => { e.stopPropagation(); openModal("cortar", r); }}>✂️</button>
                                  )}
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
                      <div className="pago-actions">
                        <select
                          className="pago-estado-select"
                          value={p.estado}
                          onChange={(e) => handleEditarPago(p.id, e.target.value)}
                          title="Cambiar estado del pago"
                        >
                          <option value="pagado">✓ Pagado</option>
                          <option value="pendiente">⏳ Pendiente</option>
                          <option value="vencido">✕ Vencido</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "garantias" && (
              <div className="detail-list">
                {garantias.length === 0 && <p className="empty-msg">Sin garantías registradas</p>}
                {garantias.map((g, i) => {
                  const rental = clientRentals.find((r) => r.id === g.alquiler_id);
                  const correoCaido = g.descripcion?.replace("Correo caído: ", "") || "";
                  return (
                    <div key={i} className="detail-item garantia-item">
                      <div className="garantia-info">
                        {rental && <span className="plataforma-badge">{rental.plataforma}</span>}
                        {correoCaido && correoCaido !== "sin correo" && (
                          <span className="correo-tag" style={{ textDecoration: "line-through", opacity: 0.5 }}>
                            ❌ {correoCaido}
                          </span>
                        )}
                        {g.cuenta_reemplazo && (
                          <span className="correo-tag" style={{ color: "#4ade80" }}>
                            ✅ {g.cuenta_reemplazo}
                          </span>
                        )}
                        <span className={`garantia-estado resuelta`}>resuelta</span>
                        {g.notas && <span className="garantia-desc">{g.notas}</span>}
                      </div>
                    </div>
                  );
                })}
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
                        <button className="plat-delete" title="Eliminar plataforma" onClick={(e) => { e.stopPropagation(); handleEliminarPlataforma(p); }}>🗑️</button>
                      </div>
                    ))}
                    <div className="plataforma-item agregar" onClick={() => setShowNuevaPlataforma(!showNuevaPlataforma)}>
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
                    <input type="text" placeholder="Nombre de la nueva plataforma" value={nuevaPlataforma} onChange={(e) => setNuevaPlataforma(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataforma()} autoFocus />
                    <button className="btn-agregar-plat" onClick={handleAgregarPlataforma}>Agregar</button>
                  </div>
                )}

                <label>Fecha inicio *</label>
                <input type="date" value={formRental.fecha_inicio} onChange={(e) => setFormRental({ ...formRental, fecha_inicio: e.target.value })} />

                <label>Días asignados *</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} className={`dias-btn ${formRental.dias === String(d) ? "active" : ""}`} onClick={() => setFormRental({ ...formRental, dias: String(d) })}>{d}d</button>
                  ))}
                </div>
                <input type="number" placeholder="O escribe los días manualmente" value={formRental.dias} onChange={(e) => setFormRental({ ...formRental, dias: e.target.value })} min="1" />

                {formRental.fecha_inicio && formRental.dias && parseInt(formRental.dias) > 0 && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Vence: {formatDate(addDays(formRental.fecha_inicio, parseInt(formRental.dias)))} — <strong>{formRental.dias} días</strong>
                  </p>
                )}

                <input type="number" placeholder="Precio por cuenta" value={formRental.precio} onChange={(e) => setFormRental({ ...formRental, precio: e.target.value })} />
                <select value={formRental.divisa} onChange={(e) => setFormRental({ ...formRental, divisa: e.target.value })}>
                  <option value="COP">COP</option>
                  <option value="USDT">USDT</option>
                </select>

                <label>Un correo por línea. Puedes agregar la contraseña con tab o doble espacio:</label>
                <textarea rows={4} placeholder={"correo1@gmail.com\tclave123\ncorreo2@gmail.com\tclave456\ncorreo3@gmail.com"} value={bulkInput} onChange={(e) => { setBulkInput(e.target.value); parseBulkCorreos(e.target.value); }} style={{ fontFamily: "monospace", fontSize: "0.82rem" }} />

                {bulkCorreos.length > 0 && (
                  <div className="bulk-preview">
                    <div className="bulk-preview-header">
                      <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>Cuentas detectadas</span>
                      <span className="bulk-count">{bulkCorreos.length} cuenta{bulkCorreos.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="bulk-list">
                      {bulkCorreos.map((item) => (
                        <div key={item.correo} className="bulk-item">
                          <span className="bulk-correo">
                            {item.correo}
                            {item.password && <span style={{ color: "#a5b4fc", marginLeft: 8 }}>🔑 {item.password}</span>}
                          </span>
                          <button className="bulk-remove" onClick={() => removeBulkCorreo(item.correo)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                      Se crearán {bulkCorreos.length} alquileres individuales
                    </p>
                  </div>
                )}

                {bulkCorreos.length === 0 && (
                  <>
                    <label>O selecciona un correo individual</label>
                    {correosDisponibles.length > 0 ? (
                      <select value={formRental.correo} onChange={(e) => setFormRental({ ...formRental, correo: e.target.value })}>
                        <option value="">Sin correo asignado</option>
                        {correosDisponibles.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    ) : (
                      <input type="text" placeholder="correo@ejemplo.com (opcional)" value={formRental.correo} onChange={(e) => setFormRental({ ...formRental, correo: e.target.value })} />
                    )}
                  </>
                )}

                <textarea placeholder="Notas (opcional)" value={formRental.notas} onChange={(e) => setFormRental({ ...formRental, notas: e.target.value })} />

                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleCreateRental}>
                    {bulkCorreos.length > 1 ? `Crear ${bulkCorreos.length} alquileres` : "Crear alquiler"}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "editar" && selectedRental && (
              <>
                <h3>✏️ Editar Alquiler</h3>
                <p className="modal-subtitle">{selectedRental.cliente_nombre} — ID #{selectedRental.id}</p>
                <label>Plataforma *</label>
                <div className="plataforma-selector">
                  <div className="plataforma-lista">
                    {plataformas.map((p) => (
                      <div key={p.id} className={`plataforma-item ${formEditar.plataforma === p.nombre ? "selected" : ""}`} onClick={() => { setFormEditar({ ...formEditar, plataforma: p.nombre }); setShowNuevaPlataforma(false); }}>
                        <span>{p.nombre}</span>
                        <button className="plat-delete" title="Eliminar plataforma" onClick={(e) => { e.stopPropagation(); handleEliminarPlataforma(p); }}>🗑️</button>
                      </div>
                    ))}
                    <div className="plataforma-item agregar" onClick={() => setShowNuevaPlataforma(!showNuevaPlataforma)}>➕ Agregar nueva plataforma...</div>
                  </div>
                  {formEditar.plataforma && <div className="plataforma-selected-label">Seleccionada: <strong>{formEditar.plataforma}</strong></div>}
                </div>
                {showNuevaPlataforma && (
                  <div className="nueva-plataforma-row">
                    <input type="text" placeholder="Nombre de la nueva plataforma" value={nuevaPlataforma} onChange={(e) => setNuevaPlataforma(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAgregarPlataforma()} autoFocus />
                    <button className="btn-agregar-plat" onClick={handleAgregarPlataforma}>Agregar</button>
                  </div>
                )}
                <label>Correo de la cuenta</label>
                {correosDisponibles.length > 0 ? (
                  <select value={formEditar.correo} onChange={(e) => setFormEditar({ ...formEditar, correo: e.target.value })}>
                    <option value="">Sin correo asignado</option>
                    {correosDisponibles.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                ) : (
                  <input type="text" placeholder="Correo de la cuenta (opcional)" value={formEditar.correo} onChange={(e) => setFormEditar({ ...formEditar, correo: e.target.value })} />
                )}
                <label>Fecha inicio *</label>
                <input type="date" value={formEditar.fecha_inicio} onChange={(e) => setFormEditar({ ...formEditar, fecha_inicio: e.target.value })} />
                <label>Días asignados *</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} className={`dias-btn ${formEditar.dias === String(d) ? "active" : ""}`} onClick={() => setFormEditar({ ...formEditar, dias: String(d) })}>{d}d</button>
                  ))}
                </div>
                <input type="number" placeholder="Días" value={formEditar.dias} onChange={(e) => setFormEditar({ ...formEditar, dias: e.target.value })} min="1" />
                {formEditar.fecha_inicio && formEditar.dias && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Vence: {formatDate(addDays(formEditar.fecha_inicio, parseInt(formEditar.dias) || 0))}
                  </p>
                )}
                <input type="number" placeholder="Precio" value={formEditar.precio} onChange={(e) => setFormEditar({ ...formEditar, precio: e.target.value })} />
                <select value={formEditar.divisa} onChange={(e) => setFormEditar({ ...formEditar, divisa: e.target.value })}>
                  <option value="COP">COP</option>
                  <option value="USDT">USDT</option>
                </select>
                <label>Estado</label>
                <select value={formEditar.estado} onChange={(e) => setFormEditar({ ...formEditar, estado: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <textarea placeholder="Notas (opcional)" value={formEditar.notas} onChange={(e) => setFormEditar({ ...formEditar, notas: e.target.value })} />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleEditarRental}>Guardar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

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
                    <button key={d} className={`dias-btn ${formDias === String(d) ? "active" : ""}`} onClick={() => setFormDias(String(d))}>{d}d</button>
                  ))}
                </div>
                <input type="number" value={formDias} onChange={(e) => setFormDias(e.target.value)} min="1" />
                {selectedRental && formDias && (
                  <p style={{ fontSize: "0.78rem", color: "#a5b4fc", margin: 0 }}>
                    📅 Nueva fecha fin: {formatDate(addDays(selectedRental.fecha_fin.split("T")[0], parseInt(formDias) || 0))}
                  </p>
                )}
                <label style={{ marginTop: "10px", display: "block" }}>Precio (opcional — actualiza si cambió)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    placeholder={`${selectedRental?.precio || 0}`}
                    value={formRenovar.precio}
                    onChange={(e) => setFormRenovar({ ...formRenovar, precio: e.target.value })}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "0.9rem", minWidth: 0, width: "100%" }}
                  />
                  <select
                    className="divisa-select"
                    value={formRenovar.divisa}
                    onChange={(e) => setFormRenovar({ ...formRenovar, divisa: e.target.value })}
                    style={{ width: 90, flexShrink: 0, padding: "8px 6px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
                  >
                    <option value="COP">COP</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRenovar}>Renovar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "renovarMasivo" && (
              <>
                <h3>↻ Renovar cuentas seleccionadas</h3>
                <p className="modal-subtitle">{selectedCuentas.length} cuenta(s) seleccionada(s)</p>
                <label>Días a extender (aplica a todas)</label>
                <div className="dias-quick">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      className={`dias-btn ${formRenovarMasivo.dias === String(d) ? "active" : ""}`}
                      onClick={() => setFormRenovarMasivo({ ...formRenovarMasivo, dias: String(d) })}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={formRenovarMasivo.dias}
                  onChange={(e) => setFormRenovarMasivo({ ...formRenovarMasivo, dias: e.target.value })}
                  min="1"
                />
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>
                  Cada cuenta extiende su propia fecha de vencimiento por {formRenovarMasivo.dias || 0} días.
                </p>
                <label style={{ marginTop: "10px", display: "block" }}>Precio (opcional — actualiza todas si se indica)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    placeholder="Dejar vacío para no cambiar"
                    value={formRenovarMasivo.precio}
                    onChange={(e) => setFormRenovarMasivo({ ...formRenovarMasivo, precio: e.target.value })}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "0.9rem", minWidth: 0, width: "100%" }}
                  />
                  <select
                    className="divisa-select"
                    value={formRenovarMasivo.divisa}
                    onChange={(e) => setFormRenovarMasivo({ ...formRenovarMasivo, divisa: e.target.value })}
                    style={{ width: 90, flexShrink: 0, padding: "8px 6px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
                  >
                    <option value="COP">COP</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRenovarMasivo}>
                    Renovar {selectedCuentas.length} cuenta(s)
                  </button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "garantia" && (
              <>
                <h3>🛡️ Aplicar Garantía</h3>
                <p className="modal-subtitle">
                  {selectedRental?.plataforma}
                  {selectedRental?.correo && (
                    <span style={{ color: "#f87171" }}> — {selectedRental.correo}</span>
                  )}
                </p>

                {selectedRental?.correo && (
                  <div style={{
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 14,
                    fontSize: "0.82rem",
                    color: "rgba(255,255,255,0.6)",
                  }}>
                    ❌ Correo caído: <code style={{ color: "#f87171" }}>{selectedRental.correo}</code>
                  </div>
                )}

                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                    background: usarInventarioGarantia ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${usarInventarioGarantia ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                  }}
                >
                  <label style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: usarInventarioGarantia ? "#4ade80" : "rgba(255,255,255,0.7)", margin: 0, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={usarInventarioGarantia} onChange={handleToggleUsarInventarioGarantia} style={{ width: 16, height: 16, flexShrink: 0, margin: 0 }} />
                    <span>📦 Usar cuenta del inventario</span>
                  </label>
                  {usarInventarioGarantia && (
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                      {cuentasInventarioGarantia.length} disponible{cuentasInventarioGarantia.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {usarInventarioGarantia ? (
                  <div style={{
                    background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)",
                    borderRadius: 10, padding: "8px 10px", marginBottom: 14,
                  }}>
                    {loadingInventarioGarantia && (
                      <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>Cargando cuentas...</p>
                    )}
                    {!loadingInventarioGarantia && cuentasInventarioGarantia.length === 0 && (
                      <p style={{ fontSize: "0.78rem", color: "#fbbf24", margin: 0 }}>
                        ⚠️ No hay cuentas disponibles de {selectedRental?.plataforma} en el inventario.
                      </p>
                    )}
                    {!loadingInventarioGarantia && cuentasInventarioGarantia.length > 0 && (
                      <>
                        <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                          Cuenta de reemplazo *
                        </label>
                        <select
                          value={inventarioSeleccionadoGarantia}
                          onChange={(e) => setInventarioSeleccionadoGarantia(e.target.value ? Number(e.target.value) : "")}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: 6,
                            background: "rgba(255,255,255,0.06)", color: "white",
                            border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="">Selecciona cuenta...</option>
                          {cuentasInventarioGarantia.map((cuenta) => (
                            <option key={cuenta.id} value={cuenta.id}>
                              {cuenta.correo} {cuenta.proveedor ? `(${cuenta.proveedor})` : ""}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                      Correo de reemplazo *
                    </label>
                    <input
                      type="email"
                      placeholder="nuevo@gmail.com"
                      value={formGarantia.correo_nuevo}
                      onChange={(e) => setFormGarantia({ ...formGarantia, correo_nuevo: e.target.value })}
                      autoFocus
                    />
                    <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4, marginTop: 8 }}>
                      Contraseña del nuevo correo (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: NexaVolt8841#"
                      value={formGarantia.password_nuevo}
                      onChange={(e) => setFormGarantia({ ...formGarantia, password_nuevo: e.target.value })}
                      style={{ fontFamily: "monospace" }}
                    />
                  </>
                )}
                <textarea
                  placeholder="Notas (opcional)"
                  value={formGarantia.notas}
                  onChange={(e) => setFormGarantia({ ...formGarantia, notas: e.target.value })}
                  rows={2}
                />
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", margin: "4px 0 12px" }}>
                  El correo caído será reemplazado y los asuntos asignados se transferirán al nuevo.
                </p>
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleRegistrarGarantia}>Aplicar garantía</button>
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

            {/* MODAL DELETE MASIVO */}
            {modalType === "deleteMasivo" && (
              <>
                <h3>🗑 Eliminar cuentas seleccionadas</h3>
                <p className="modal-subtitle">
                  Se eliminarán {selectedCuentas.length} cuenta(s) con todos sus pagos y garantías. Esta acción no se puede deshacer.
                </p>

                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>
                  ¿Cómo quedan las cuentas en el inventario?
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`dias-btn ${formDeleteOptions.estado_inventario === "Disponible" ? "active" : ""}`}
                    onClick={() => setFormDeleteOptions({ ...formDeleteOptions, estado_inventario: "Disponible" })}
                  >
                    🟢 Disponible
                  </button>
                  <button
                    type="button"
                    className={`dias-btn ${formDeleteOptions.estado_inventario === "Caída" ? "active" : ""}`}
                    onClick={() => setFormDeleteOptions({ ...formDeleteOptions, estado_inventario: "Caída" })}
                  >
                    🟡 Caída
                  </button>
                </div>

                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Nueva contraseña para estas cuentas (opcional — se aplica a todas)
                </label>
                <input
                  type="text"
                  placeholder="Dejar vacío para no cambiar la contraseña"
                  value={formDeleteOptions.new_password}
                  onChange={(e) => setFormDeleteOptions({ ...formDeleteOptions, new_password: e.target.value })}
                  style={{ fontFamily: "monospace" }}
                />

                <div className="modal-actions">
                  <button className="btn-danger" onClick={handleEliminarMasivo}>Eliminar {selectedCuentas.length} cuenta(s)</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "pagoMasivo" && (
              <>
                <h3>💳 Pago masivo</h3>
                <p className="modal-subtitle">{selectedCuentas.length} cuenta(s) seleccionada(s)</p>
                <input type="number" placeholder="Monto *" value={formPagoMasivo.monto} onChange={(e) => setFormPagoMasivo({ ...formPagoMasivo, monto: e.target.value })} min="0" />
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
                  <button className="btn-primary" onClick={handlePagoMasivo}>Registrar {selectedCuentas.length} pago(s)</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {/* MODAL DELETE INDIVIDUAL */}
            {modalType === "delete" && (
              <>
                <h3>¿Eliminar alquiler?</h3>
                <p className="modal-subtitle">
                  Se eliminará {selectedRental?.plataforma}
                  {selectedRental?.correo && ` (${selectedRental.correo})`} y todos sus pagos y garantías. Esta acción no se puede deshacer.
                </p>

                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>
                  ¿Cómo queda la cuenta en el inventario?
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`dias-btn ${formDeleteOptions.estado_inventario === "Disponible" ? "active" : ""}`}
                    onClick={() => setFormDeleteOptions({ ...formDeleteOptions, estado_inventario: "Disponible" })}
                  >
                    🟢 Disponible
                  </button>
                  <button
                    type="button"
                    className={`dias-btn ${formDeleteOptions.estado_inventario === "Caída" ? "active" : ""}`}
                    onClick={() => setFormDeleteOptions({ ...formDeleteOptions, estado_inventario: "Caída" })}
                  >
                    🟡 Caída
                  </button>
                </div>

                <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 }}>
                  Nueva contraseña para esta cuenta (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Dejar vacío para no cambiar la contraseña"
                  value={formDeleteOptions.new_password}
                  onChange={(e) => setFormDeleteOptions({ ...formDeleteOptions, new_password: e.target.value })}
                  style={{ fontFamily: "monospace" }}
                />

                <div className="modal-actions">
                  <button className="btn-danger" onClick={handleDeleteRental}>Eliminar</button>
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              </>
            )}

            {modalType === "cortar" && (
              <>
                <h3>✂️ Cortar alquiler vencido</h3>
                <p className="modal-subtitle">
                  {selectedRental?.plataforma}
                  {selectedRental?.correo && ` — ${selectedRental.correo}`}
                  {selectedRental && selectedRental.dias_restantes < 0 && (
                    <span style={{ color: "#f87171" }}> ({Math.abs(selectedRental.dias_restantes)}d vencido)</span>
                  )}
                </p>
                <div style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 14,
                  fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.6)",
                }}>
                  Se eliminará el alquiler, se quitará el acceso del cliente (correo y asuntos autorizados)
                  y la cuenta del inventario quedará según elijas abajo.
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                  ¿Cómo queda la cuenta del inventario?
                </p>
                <div className="modal-actions" style={{ flexDirection: "column", gap: 8 }}>
                  <button className="btn-primary" onClick={() => handleCortarAlquiler("Disponible")}>
                    🟢 Liberar — queda Disponible para otro cliente
                  </button>
                  <button className="btn-danger" onClick={() => handleCortarAlquiler("Caída")}>
                    🟡 Marcar como Caída — revisar antes de reasignar
                  </button>
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