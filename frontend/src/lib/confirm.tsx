import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Modal from "../components/Modal";

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: "primary" | "danger";
}

type Resolver = (ok: boolean) => void;

const Ctx = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolver | null>(null);

  const ask = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOpts(o);
      setResolver(() => resolve);
      setOpen(true);
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    if (resolver) resolver(result);
    setResolver(null);
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Modal open={open} onClose={() => close(false)} title={opts?.title ?? ""}>
        {opts?.body && <div className="text-sm text-[var(--color-ink-soft)] mb-5">{opts.body}</div>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => close(false)}>
            {opts?.cancelLabel ?? "Cancel"}
          </button>
          <button
            className={"btn " + (opts?.kind === "danger" ? "btn-coral" : "btn-primary")}
            onClick={() => close(true)}
            autoFocus
          >
            {opts?.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConfirm must be used within ConfirmProvider");
  return v;
}
