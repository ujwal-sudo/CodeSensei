import React, { useRef, useEffect } from "react";
import { COLORS, SUGGESTED_PROMPTS } from "./tabStyles";

export function ChatbotTab({ messages, input, setInput, send, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      send(input); 
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0, padding: "20px" }}>
      {messages.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: COLORS.mono, fontSize: 22, fontWeight: 700, color: COLORS.accent, letterSpacing: "0.12em", marginBottom: 6 }}>CODESENSEI</div>
            <div style={{ fontFamily: COLORS.ui, fontSize: 13, color: COLORS.textMuted }}>Ask anything about the codebase</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 640, width: "100%" }}>
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => setInput(p)} style={{
                background: COLORS.card, border: `0.5px solid ${COLORS.cardBorder}`,
                borderRadius: 8, padding: "10px 14px", textAlign: "left",
                fontFamily: COLORS.ui, fontSize: 12, color: COLORS.textSecondary,
                cursor: "pointer", lineHeight: 1.5, transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.cardBorder}
              >{p}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", padding: "4px 0 12px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, marginBottom: 16,
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              {m.role === "model" && (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: COLORS.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: COLORS.mono, fontSize: 10, fontWeight: 700, color: "#000",
                  flexShrink: 0, marginTop: 2,
                }}>CS</div>
              )}
              <div style={{
                maxWidth: "72%", padding: "10px 14px", borderRadius: 10,
                background: m.role === "user" ? "#1f2a10" : COLORS.card,
                border: `0.5px solid ${m.role === "user" ? "#3a5a10" : COLORS.cardBorder}`,
                fontFamily: COLORS.ui, fontSize: 13, color: COLORS.textPrimary,
                lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>{m.text || m.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: COLORS.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: COLORS.mono, fontSize: 10, fontWeight: 700, color: "#000", flexShrink: 0,
              }}>CS</div>
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: COLORS.card, border: `0.5px solid ${COLORS.cardBorder}`,
              }}>
                <span style={{ fontFamily: COLORS.mono, fontSize: 13, color: COLORS.textMuted }}>
                  {"analyzing".split("").map((c, i) => (
                    <span key={i} style={{ animation: `blink 1.2s ${i * 0.1}s infinite`, display: "inline-block" }}>{c}</span>
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{
        background: COLORS.card, border: `0.5px solid ${COLORS.cardBorder}`,
        borderRadius: 10, padding: "4px 4px 4px 14px",
        display: "flex", alignItems: "flex-end", gap: 8, marginTop: 8,
        minHeight: "44px"
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about this codebase…"
          rows={1}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none", resize: "none",
            fontFamily: COLORS.ui, fontSize: 13, color: COLORS.textPrimary,
            lineHeight: 1.6, padding: "8px 0", minHeight: 36, maxHeight: 120,
            caretColor: COLORS.accent,
          }}
          onInput={e => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? COLORS.accent : "#2a2a2a",
            border: "none", borderRadius: 7, padding: "8px 14px",
            fontFamily: COLORS.mono, fontSize: 12, fontWeight: 600,
            color: input.trim() && !loading ? "#000" : COLORS.textMuted,
            cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "background 0.15s, color 0.15s", marginBottom: 2,
          }}
        >↑</button>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
    </div>
  );
}
