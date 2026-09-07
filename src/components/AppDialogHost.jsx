import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { registerAppDialogHandler } from "../services/appDialog";

export default function AppDialogHost() {
  const [queue, setQueue] = useState([]);
  const cancelRef = useRef(null);
  const active = queue[0] || null;

  useEffect(() => registerAppDialogHandler((item) => {
    setQueue((current) => [...current, item]);
  }), []);

  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    const close = () => {
      active.resolve(false);
      setQueue((current) => current.slice(1));
    };
    const onKeyDown = (event) => event.key === "Escape" && close();
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => cancelRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [active]);

  if (!active) return null;
  const settle = (value) => {
    active.resolve(value);
    setQueue((current) => current.slice(1));
  };

  return createPortal(
    <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && settle(false)} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "grid", placeItems: "center", padding: 18, background: "rgba(20, 18, 16, .58)", backdropFilter: "blur(3px)" }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="cashier-dialog-title" aria-describedby={active.message ? "cashier-dialog-message" : undefined} style={{ width: "min(480px, 100%)", overflow: "hidden", border: "2px solid var(--ink-800)", borderRadius: 18, background: "white", color: "var(--ink-900)", boxShadow: "0 8px 0 rgba(28, 25, 23, .2), 0 24px 60px rgba(28, 25, 23, .22)" }}>
        <header style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: 20 }}>
          <span style={{ width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", borderRadius: 12, background: "#fee2e2", color: "#b91c1c" }}><FaExclamationTriangle size={19} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ marginBottom: 5, color: "#b91c1c", fontSize: 11, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>{active.eyebrow}</div>
            <h2 id="cashier-dialog-title" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.25 }}>{active.title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={() => settle(false)} style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: "1px solid var(--ink-300)", borderRadius: 10, background: "white", color: "var(--ink-600)", cursor: "pointer" }}><FaTimes size={16} /></button>
        </header>
        {active.message ? <p id="cashier-dialog-message" style={{ margin: 0, padding: "0 20px 18px 75px", color: "var(--ink-600)", fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>{active.message}</p> : null}
        <footer style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--ink-200)", background: "var(--ink-25)" }}>
          <button ref={cancelRef} type="button" onClick={() => settle(false)} style={{ minHeight: 42, padding: "0 17px", border: "1.5px solid var(--ink-400)", borderRadius: 10, background: "white", color: "var(--ink-800)", fontWeight: 800, cursor: "pointer" }}>{active.cancelLabel}</button>
          <button type="button" onClick={() => settle(true)} style={{ minHeight: 42, padding: "0 17px", border: "1.5px solid #b91c1c", borderRadius: 10, background: "#b91c1c", color: "white", fontWeight: 800, cursor: "pointer" }}>{active.confirmLabel}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
