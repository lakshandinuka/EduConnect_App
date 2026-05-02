import React, { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer
} from "recharts";

const COLORS = ["#0d2b6b", "#4f86f7", "#22c55e", "#f97316", "#a855f7", "#ec4899"];

const th = {
  padding: "10px 16px", textAlign: "left",
  color: "#0d2b6b", fontWeight: 600, fontSize: 11
};
const td = {
  padding: "10px 16px", textAlign: "left"
};

export default function AnalyticsDashboard() {
  const [trendByDept, setTrendByDept] = useState([]);
  const [selectedDept, setSelectedDept] = useState("All");
  const [resolution, setResolution] = useState({});
  const [sla, setSla] = useState({});
  const [sentiment, setSentiment] = useState([]);
  const [status, setStatus] = useState([]);
  const [agents, setAgents] = useState([]);
  const [satisfaction, setSatisfaction] = useState({});
  const [total, setTotal] = useState({});
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyFilter, setAnomalyFilter] = useState("All");
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [showCount, setShowCount] = useState(5);

  useEffect(() => {
    // use api instance (with auth token) instead of raw axios
    api.get("/dashboard/total").then(r => setTotal(r.data)).catch(e => console.error(e));
    api.get("/dashboard/resolution").then(r => setResolution(r.data)).catch(e => console.error(e));
    api.get("/dashboard/sla").then(r => setSla(r.data)).catch(e => console.error(e));
    api.get("/dashboard/sentiment").then(r => setSentiment(r.data)).catch(e => console.error(e));
    api.get("/dashboard/status").then(r => setStatus(r.data)).catch(e => console.error(e));
    api.get("/dashboard/agents").then(r => setAgents(r.data)).catch(e => console.error(e));
    api.get("/dashboard/satisfaction").then(r => setSatisfaction(r.data)).catch(e => console.error(e));
    api.get("/dashboard/anomaly").then(r => setAnomalies(r.data.anomalies || [])).catch(e => console.error(e));

    api.get("/dashboard/trend-by-department").then(r => {
      const pivot = {};
      r.data.forEach((row) => {
        const d = String(row.date).substring(0, 10);
        const dept = row.department;
        const count = row.dailyCount || row.count || 0;
        if (!pivot[d]) pivot[d] = { date: d };
        pivot[d][dept] = count;
      });
      setTrendByDept(Object.values(pivot).sort((a, b) => a.date.localeCompare(b.date)));
    }).catch(e => console.error(e));
  }, []);

  return (
    <>
      <Navbar />
      <div style={{
        background: "#f0f4ff",
        minHeight: "100vh",
        width: "100vw",
        padding: "32px 40px",
        fontFamily: "sans-serif",
        boxSizing: "border-box"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ color: "#1a2d53", fontSize: 36, fontWeight: "bold", marginBottom: 12 }}>
            SFS Academy – Analytics Dashboard
          </h1>
          <p style={{ color: "#555", fontSize: 16 }}>
            Real-time ticket support insights
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <KPICard title="Total Tickets" value={total.totalTickets ?? "–"} />
          <KPICard title="Avg Resolution Time" value={`${resolution.avgResolutionHours ?? "–"} hrs`} />
          <KPICard title="Avg First Response" value={`${resolution.avgFirstResponseHours ?? "–"} hrs`} />
          <KPICard title="SLA Compliant" value={`${sla.compliant ?? "–"} / ${sla.total ?? "–"}`} />
          <KPICard title="SLA Breached" value={sla.breached ?? "–"} alert={sla.breached > 0} />
          <KPICard title="Avg Satisfaction" value={`${satisfaction.avgScore ?? "–"} / 5`} />
        </div>

        {/* Ticket Trend by Department */}
        <Section title="Ticket Volume by Department">
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["All", "IT Support", "Finance", "Academic Affairs", "Library", "Student Services"].map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  background: selectedDept === dept ? "#0d2b6b" : "#e8edf8",
                  color: selectedDept === dept ? "#fff" : "#0d2b6b",
                  fontWeight: selectedDept === dept ? "bold" : "normal",
                  fontSize: 12
                }}
              >
                {dept}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={selectedDept === "All" ? trendByDept : trendByDept.map(d => ({ date: d.date, count: d[selectedDept] || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedDept === "All" ? (
                <>
                  <Line type="monotone" dataKey="IT Support" stroke="#0d2b6b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Finance" stroke="#4f86f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Academic Affairs" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Library" stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Student Services" stroke="#ec4899" strokeWidth={2} dot={false} />
                </>
              ) : (
                <Line type="monotone" dataKey="count" stroke="#0d2b6b" strokeWidth={2} dot={false} name={selectedDept} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Section>

        {/* Anomaly Alerts */}
        <Section title="Anomaly Alerts">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "#2c2929" }}>
              Showing top {Math.min(showCount, anomalies.filter(a => anomalyFilter === "All" || a.severity === anomalyFilter).length)} of {anomalies.filter(a => anomalyFilter === "All" || a.severity === anomalyFilter).length} anomalous tickets
            </span>
            <select
              value={anomalyFilter}
              onChange={e => { setAnomalyFilter(e.target.value); setShowCount(7); }}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid #ddd",
                fontSize: 13, color: "#7692cf", cursor: "pointer"
              }}
            >
              <option value="All">All Severities</option>
              <option value="HIGH">HIGH only</option>
              <option value="MEDIUM">MEDIUM only</option>
            </select>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f0f4ff" }}>
                <th style={th}>Ticket ID</th>
                <th style={th}>Severity</th>
                <th style={th}>Anomaly Score</th>
                <th style={th}>Reason</th>
                <th style={th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {anomalies
                .filter(a => anomalyFilter === "All" || a.severity === anomalyFilter)
                .slice(0, showCount)
                .map((a, i) => (
                  <React.Fragment key={i}>
                    <tr
                      onClick={() => setExpandedTicket(expandedTicket === i ? null : i)}
                      style={{
                        cursor: "pointer",
                        background: expandedTicket === i ? "#FEF3C7" : i % 2 === 0 ? "#fff" : "#f9fafb",
                        borderBottom: "1px solid #eee"
                      }}
                    >
                      <td style={td}>
                        <span style={{ fontWeight: 600, color: "#0d2b6b" }}>#{a.ticket_id}</span>
                      </td>
                      <td style={td}>
                        <span style={{
                          background: a.severity === "HIGH" ? "#FEE2E2" : "#FEF3C7",
                          color: a.severity === "HIGH" ? "#991B1B" : "#92400E",
                          padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600
                        }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ ...td, color: "#666" }}>{a.anomaly_score}</td>
                      <td style={{ ...td, color: "#555", fontSize: 12 }}>
                        {a.reasons ? a.reasons[0] : "Unusual pattern"}
                      </td>
                      <td style={{ ...td, color: "#4f86f7" }}>
                        {expandedTicket === i ? "▲ Hide" : "▼ View"}
                      </td>
                    </tr>
                    {expandedTicket === i && (
                      <tr>
                        <td colSpan={5} style={{ padding: "16px", background: "#FFFBEB", borderBottom: "1px solid #eee" }}>
                          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 12 }}>
                            <DetailItem label="Ticket ID" value={`#${a.ticket_id}`} />
                            <DetailItem label="Severity" value={a.severity} />
                            <DetailItem label="Anomaly Score" value={a.anomaly_score} />
                            <DetailItem label="Resolution Time" value={`${a.resolution_time_mins} mins`} />
                            <DetailItem label="Agent Workload" value={a.agent_workload_score} />
                            <DetailItem label="Reassignments" value={a.reassignment_count} />
                            <DetailItem label="SLA Breached" value={a.sla_breach === 1 ? "Yes" : "No"} />
                            <DetailItem label="Hour of Day" value={`${a.hour_of_day}:00`} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>All detected reasons:</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {(a.reasons || ["Unusual pattern detected"]).map((r, ri) => (
                                <span key={ri} style={{
                                  background: "#FEE2E2", color: "#991B1B",
                                  padding: "3px 10px", borderRadius: 12, fontSize: 12
                                }}>
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>

          {anomalies.filter(a => anomalyFilter === "All" || a.severity === anomalyFilter).length > showCount && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                onClick={() => setShowCount(showCount + 3)}
                style={{
                  padding: "8px 24px", borderRadius: 20,
                  border: "1px solid #0d2b6b", background: "#fff",
                  color: "#0d2b6b", cursor: "pointer", fontSize: 13
                }}
              >
                Show more ({anomalies.filter(a => anomalyFilter === "All" || a.severity === anomalyFilter).length - showCount} remaining)
              </button>
            </div>
          )}
        </Section>

        <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
          {/* Sentiment */}
          <Section title="Sentiment Distribution" style={{ flex: 1, minWidth: 320 }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentiment}
                  dataKey="count"
                  nameKey="sentiment"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle"
                        dominantBaseline="central" fontSize={14} fontWeight="bold">
                        {value}
                      </text>
                    );
                  }}
                >
                  {sentiment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Section>

          {/* Status */}
          <Section title="Tickets by Status" style={{ flex: 1, minWidth: 320 }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={status} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 11, fontWeight: "bold", fill: "#0d2b6b" }}
                  angle={0} textAnchor="middle" interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#68c39f" />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Agent Workload */}
        <Section title="Agent Workload">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agents} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="agent_name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ticketCount" fill="#0d2b6b" name="Tickets Handled" />
              <Bar dataKey="avgResolutionHours" fill="#4f86f7" name="Avg Resolution (hrs)" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
    </>
  );
}

function KPICard({ title, value, alert }) {
  return (
    <div style={{
      background: alert ? "#fff1f0" : "#fff",
      border: `2px solid ${alert ? "#f87171" : "#1e4db7"}`,
      borderRadius: 12, padding: "16px 24px", flex: "1 1 160px", textAlign: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    }}>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: "bold", color: alert ? "#dc2626" : "#0d2b6b" }}>{value}</div>
    </div>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 20,
      marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", ...style
    }}>
      <h2 style={{ color: "#0d2b6b", marginBottom: 16, fontSize: 16, borderBottom: "1px solid #eee", paddingBottom: 8 }}>{title}</h2>
      {children}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0d2b6b" }}>{value}</div>
    </div>
  );
}