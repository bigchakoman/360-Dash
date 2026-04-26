import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "./api";

const FLAG_KEY = "360dash.mustChangePassword";

interface AuthCtx {
  isAuthed: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const readFlag = () => localStorage.getItem(FLAG_KEY) === "1";
const writeFlag = (v: boolean) => {
  if (v) localStorage.setItem(FLAG_KEY, "1");
  else localStorage.removeItem(FLAG_KEY);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => Boolean(tokenStore.get()));
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => readFlag());

  useEffect(() => {
    const interval = setInterval(() => {
      const has = Boolean(tokenStore.get());
      setIsAuthed((prev) => (prev !== has ? has : prev));
      if (!has && mustChangePassword) {
        setMustChangePassword(false);
        writeFlag(false);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [mustChangePassword]);

  return (
    <Ctx.Provider
      value={{
        isAuthed,
        mustChangePassword,
        async login(email, password) {
          const r = await api.login(email, password);
          tokenStore.set(r.access_token);
          writeFlag(r.must_change_password);
          setMustChangePassword(r.must_change_password);
          setIsAuthed(true);
        },
        async changePassword(current, next) {
          const r = await api.changePassword(current, next);
          tokenStore.set(r.access_token);
          writeFlag(false);
          setMustChangePassword(false);
        },
        logout() {
          tokenStore.clear();
          writeFlag(false);
          setMustChangePassword(false);
          setIsAuthed(false);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
