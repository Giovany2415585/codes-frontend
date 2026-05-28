import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import "./Dashboard.css";

interface AccessLog {
  id: number;
  correo: string;
  asuntos_count: number;
  asuntos_detalle: string;
  fecha: string;
  first_name: string;
  user_email: string;
}

function Dashboard() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // refresca cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await apiFetch("/api/admin/code-access-logs?limit=100");
      setLogs(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const tiempoRelativo = (fecha: string) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Ahora mismo";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const dias = Math.floor(hrs / 24);
    return `hace ${dias}d`;
  };

  const filtered = logs.filter(l =>
    l.correo.toLowerCase().includes(search.toLowerCase()) ||
    l.first_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.asuntos_detalle || "").toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const hoy = new Date().toDateString();
  const consultasHoy = logs.filter(l => new Date(l.fecha).toDateString() === hoy).length;
  const clientesUnicos = new Set(logs.map(l => l.user_email)).size;
  const correosUnicos = new Set(logs.map(l => l.correo)).size;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>📊 Actividad reciente</h1>
        <button className="btn-refresh" onClick={loadLogs}>↺ Actualizar</button>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-number">{consultasHoy}</span>
          <span className="stat-label">Consultas hoy</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{logs.length}</span>
          <span className="stat-label">Total registros</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{clientesUnicos}</span>
          <span className="stat-label">Clientes activos</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{correosUnicos}</span>
          <span className="stat-label">Correos consultados</span>
        </div>
      </div>

      {/* Buscar */}
      <input
        className="dashboard-search"
        placeholder="Buscar por cliente, correo o asunto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Tabla */}
      {loading ? (
        <div className="dashboard-empty">Cargando actividad...</div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-empty">
          {search ? "No se encontraron resultados" : "Sin actividad registrada aún"}
        </div>
      ) : (
        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Correo consultado</th>
                <th>Asuntos</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <>
                  <tr key={log.id} className={expandedId === log.id ? "expanded" : ""}>
                    <td>
                      <span className="log-cliente">{log.first_name}</span>
                    </td>
                    <td>
                      <span className="log-correo">{log.correo}</span>
                    </td>
                    <td>
                      <span className="log-count">{log.asuntos_count} asunto{log.asuntos_count !== 1 ? "s" : ""}</span>
                    </td>
                    <td>
                      <span className="log-fecha" title={formatFecha(log.fecha)}>
                        {tiempoRelativo(log.fecha)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-expand"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        {expandedId === log.id ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="detail-row">
                      <td colSpan={5}>
                        <div className="log-detail">
                          <span className="detail-label">📅 {formatFecha(log.fecha)}</span>
                          <span className="detail-label">📧 {log.user_email}</span>
                          <div className="detail-asuntos">
                            {(log.asuntos_detalle || "").split(", ").map((a, i) => (
                              <span key={i} className="asunto-tag">{a}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
