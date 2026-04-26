import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastKind = "info" | "success" | "error";
interface Toast { id: number; kind: ToastKind; text: string; }

const Ctx = createContext<{ push: (kind: ToastKind, text: string) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "card shadow-lg text-sm " +
              (t.kind === "success"
                ? "border-l-4 border-l-[var(--color-brand-blue)]"
                : t.kind === "error"
                ? "border-l-4 border-l-[var(--color-coral)]"
                : "border-l-4 border-l-[var(--color-gold)]")
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}
