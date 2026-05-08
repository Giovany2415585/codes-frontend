import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../services/api";

interface SecurityLog {
  id: number;
  user_email: string;
  affected_email: string;
  dangerous_subject: string;
  locked_at: string;
}

function SecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const data = await apiFetch("/api/admin/security-logs");
      setLogs(data);
    } catch {
      toast.error("Error cargando logs");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("¿Eliminar todos los logs?")) return;
    try {
      await apiFetch("/api/admin/security-logs", { method: "DELETE" });
      setLogs([]);
      toast.success("Logs eliminados");
    } catch {
      toast.error("Error eliminando logs");
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const totalThisMonth = logs.filter(l => {
    const d = new Date(l.locked_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const uniqueUsers = new Set(logs.map(l => l.user_email)).size;

  return (
    <div className="users-container">
      <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 500 }}>🔐 Historial de bloqueos</h2>
          {logs.length > 0 && (
            <button onClick={handleClear} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,80,80,0.4)", background: "transparent", color: "#ff6b6b", cursor: "pointer", fontSize: "0.85rem" }}>
              Limpiar historial
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
          {[
            { label: "Total bloqueos", value: logs.length },
            { label: "Este mes", value: totalThisMonth },
            { label: "Usuarios afectados", value: uniqueUsers },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "1rem", border: "0.5px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 4px" }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Eventos de seguridad</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{logs.length} eventos</span>
          </div>

          {loading && (
            <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Cargando...</div>
          )}

          {!loading && logs.length === 0 && (
            <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              Sin bloqueos registrados
            </div>
          )}

          {!loading && logs.map((log, i) => (
            <div key={log.id} style={{ padding: "14px 16px", borderBottom: i < logs.length - 1 ? "0.5px solid rgba(255,255,255,0.06)" : "none", display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 0.8fr", gap: 12, alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 3px" }}>Usuario</p>
                <p style={{ fontSize: 12, fontWeight: 500, margin: 0, wordBreak: "break-all" }}>{log.user_email}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 3px" }}>Correo afectado</p>
                <p style={{ fontSize: 12, margin: 0, wordBreak: "break-all", color: "rgba(255,255,255,0.8)" }}>{log.affected_email}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 3px" }}>Asunto peligroso</p>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(255,80,80,0.15)", color: "#ff6b6b", fontWeight: 500, display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.dangerous_subject}
                </span>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 3px" }}>Fecha</p>
                <p style={{ fontSize: 11, margin: 0, color: "rgba(255,255,255,0.6)" }}>{formatDate(log.locked_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SecurityLogs;
