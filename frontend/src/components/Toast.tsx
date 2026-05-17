import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (message.duration === 0) return;
    const timer = setTimeout(
      () => onDismiss(message.id),
      message.duration || 4000,
    );
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const icons: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  return (
    <div className={`toast toast-${message.type}`} role="alert">
      <span className="toast-icon">{icons[message.type]}</span>
      <span className="toast-message">{message.message}</span>
      <button
        className="toast-close"
        onClick={() => onDismiss(message.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addMessage = (
    message: string,
    type: ToastType = "info",
    duration?: number,
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, type, message, duration }]);
    return id;
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Store on window for access from anywhere
  (window as any).__toast = { addMessage, removeMessage };

  return (
    <div className="toast-container">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={removeMessage} />
      ))}
    </div>
  );
}

export function useToast() {
  return {
    success: (message: string, duration?: number) =>
      (window as any).__toast?.addMessage(message, "success", duration),
    error: (message: string, duration?: number) =>
      (window as any).__toast?.addMessage(message, "error", duration),
    warning: (message: string, duration?: number) =>
      (window as any).__toast?.addMessage(message, "warning", duration),
    info: (message: string, duration?: number) =>
      (window as any).__toast?.addMessage(message, "info", duration),
  };
}
