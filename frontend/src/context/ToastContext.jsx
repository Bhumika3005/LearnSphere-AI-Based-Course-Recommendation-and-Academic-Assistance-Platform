import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import "../styles/Toast.css";

const ToastContext = createContext(null);

/**
 * Safely turn any axios error into a plain, renderable string.
 *
 * FastAPI's `detail` field is NOT always a string:
 *   - HTTPException(detail="some message")  → detail is a string
 *   - A Pydantic validation failure (422)   → detail is an ARRAY of
 *     objects like {type, loc, msg, input}
 *
 * Passing that array straight into a toast/JSX crashes React with
 * "Objects are not valid as a React child". This always returns a
 * plain string, so callers never need to worry about the shape.
 */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d) => {
        if (!d || typeof d !== "object") return String(d);
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .filter(Boolean)
      .join(" · ") || fallback;
  }
  if (detail && typeof detail === "object") {
    return detail.msg || fallback;
  }
  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function toRenderableMessage(message) {
  if (typeof message === "string" || typeof message === "number") {
    return String(message);
  }
  // Defensive fallback: never let a non-string value (e.g. an accidental
  // FastAPI validation-error array/object) reach JSX and crash the app.
  if (Array.isArray(message)) {
    return message
      .map((m) => (m && typeof m === "object" ? m.msg : String(m)))
      .filter(Boolean)
      .join(" · ") || "Something went wrong.";
  }
  if (message && typeof message === "object") {
    return message.msg || "Something went wrong.";
  }
  return "Something went wrong.";
}

/**
 * useToast() gives you:
 *   showToast(message, type?, durationMs?)   — non-blocking notification,
 *       type is "success" | "error" | "info" (default "info")
 *   confirmDialog(message, opts?)            — returns a Promise<boolean>,
 *       resolves true if the user confirmed, false if they cancelled.
 *       opts: { confirmLabel, cancelLabel, danger }
 *
 * These replace window.alert()/window.confirm(), which block the whole
 * browser tab, look inconsistent across browsers/OSes, and can't be
 * styled — not something you want in front of a college panel.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolveRef = useRef(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++idCounter;
    const safeMessage = toRenderableMessage(message);
    setToasts((prev) => [...prev, { id, message: safeMessage, type }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const confirmDialog = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        message,
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel: opts.cancelLabel || "Cancel",
        danger: !!opts.danger,
      });
    });
  }, []);

  const handleConfirmChoice = (result) => {
    if (resolveRef.current) resolveRef.current(result);
    resolveRef.current = null;
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, confirmDialog }}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => removeToast(t.id)}
            role="status"
          >
            <span className="toast-icon">
              {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="confirm-overlay" onClick={() => handleConfirmChoice(false)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-msg">{confirmState.message}</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => handleConfirmChoice(false)}>
                {confirmState.cancelLabel}
              </button>
              <button
                className={`confirm-btn ${confirmState.danger ? "danger" : "primary"}`}
                onClick={() => handleConfirmChoice(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}