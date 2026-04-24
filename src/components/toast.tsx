"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function nextId() {
  return String(++toastId);
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      addToast: (_msg: string, _type?: ToastType) => {},
      removeToast: (_id: string) => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 5000) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const style = {
    success:
      "border-emerald-500/50 bg-emerald-500/10 text-emerald-100 dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-100",
    error:
      "border-red-500/50 bg-red-500/10 text-red-100 dark:border-red-400/50 dark:bg-red-500/20 dark:text-red-100",
    info: "border-amber-500/50 bg-amber-500/10 text-amber-100 dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-100",
  };
  const icon = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${style[toast.type]}`}
      role="alert"
    >
      <span className="mt-0.5 shrink-0 text-lg" aria-hidden>
        {icon[toast.type]}
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
