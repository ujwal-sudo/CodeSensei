import React, { useState } from "react";
import { COLORS } from "./tabStyles";

function Badge({ severity }) {
  const sMap = {
    critical: { bg: "#7f1d1d", color: "#fca5a5", border: "#991b1b" },
    high:     { bg: "#7f1d1d", color: "#fca5a5", border: "#991b1b" },
    medium:   { bg: "#431407", color: "#fb923c", border: "#7c2d12" },
    low:      { bg: "#0c1a2e", color: "#60a5fa", border: "#1e3a5f" },
  };
  const normalizedSev = (severity || "low").toLowerCase();
  const s = sMap[normalizedSev] || sMap.low;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      fontFamily: COLORS.mono, padding: "2px 7px", borderRadius: 4,
      background: s.bg, color: s.color, textTransform: "uppercase",
      border: `0.5px solid ${s.border}`,
    }}>{normalizedSev}</span>
  );
}

export function RisksTab({ risks = [] }) {
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("severity");
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = risks
    .filter(r => filter === "ALL" || (r.severity || "").toLowerCase() === filter.toLowerCase())
    .sort((a, b) => sort === "severity"
      ? severityOrder[(a.severity || "low").toLowerCase()] - severityOrder[(b.severity || "low").toLowerCase()]
      : (a.location || a.file || "").localeCompare(b.location || b.file || ""));

  const counts = { 
    HIGH: risks.filter(r => ["high", "critical"].includes((r.severity || "").toLowerCase())).length, 
    MEDIUM: risks.filter(r => (r.severity || "").toLowerCase() === "medium").length, 
    LOW: risks.filter(r => (r.severity || "").toLowerCase() === "low").length 
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12, padding: "20px" }}>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "Total Risks", value: risks.length, color: COLORS.textPrimary },
          { label: "High", value: counts.HIGH, color: "#fca5a5" },
          { label: "Medium", value: counts.MEDIUM, color: "#fb923c" },
          { label: "Low", value: counts.LOW, color: "#60a5fa" },
        ].map(s => (
          <div key={s.label} style={{
            background: COLORS.card, border: `0.5px solid ${COLORS.cardBorder}`,
            borderRadius: 8, padding: "12px 18px", flex: 1,
          }}>
            <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? COLORS.accent : COLORS.card,
            border: `0.5px solid ${filter === f ? COLORS.accent : COLORS.cardBorder}`,
            borderRadius: 6, padding: "5px 12px",
            fontFamily: COLORS.mono, fontSize: 11, fontWeight: 600,
            color: filter === f ? "#000" : COLORS.textMuted,
            cursor: "pointer", letterSpacing: "0.05em",
          }}>{f}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: COLORS.mono, fontSize: 11, color: COLORS.textMuted }}>Sort:</span>
          {["severity", "file"].map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              background: sort === s ? "#222" : "transparent",
              border: `0.5px solid ${sort === s ? "#444" : "transparent"}`,
              borderRadius: 5, padding: "4px 10px",
              fontFamily: COLORS.mono, fontSize: 11,
              color: sort === s ? COLORS.textPrimary : COLORS.textMuted,
              cursor: "pointer",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Risk table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "80px 1fr 180px 100px",
          gap: 0, padding: "8px 14px",
          borderBottom: `0.5px solid ${COLORS.cardBorder}`,
          position: "sticky", top: 0, background: COLORS.bg, zIndex: 1,
        }}>
          {["Severity", "Description / Mitigation", "Location", "ID"].map(h => (
            <div key={h} style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>

        {filtered.map((r, i) => (
          <div key={r.id || i} style={{
            display: "grid", gridTemplateColumns: "80px 1fr 180px 100px",
            gap: 0, padding: "12px 14px",
            borderBottom: `0.5px solid #1e1e1e`,
            background: i % 2 === 0 ? "transparent" : "#0d0d0d",
            transition: "background 0.1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"}
          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "#0d0d0d"}
          >
            <div style={{ paddingTop: 2 }}><Badge severity={r.severity} /></div>
            <div style={{ paddingRight: 16 }}>
              <div style={{ fontFamily: COLORS.ui, fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, marginBottom: 4 }}>{r.description}</div>
              <div style={{ fontFamily: COLORS.ui, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.55 }}>{r.mitigation}</div>
            </div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 11, color: COLORS.accent, wordBreak: "break-all", paddingRight: 8, paddingTop: 2 }}>
              {r.location || r.file}
            </div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 11, color: COLORS.textMuted, paddingTop: 2 }}>{r.id || 'N/A'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
