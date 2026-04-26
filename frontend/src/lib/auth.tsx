import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "./api";

interface AuthCtx {
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => Boolean(tokenStore.get()));

  useEffect(() => {
    // Token may be removed elsewhere (e.g. 401 interceptor)
    const interval = setInterval(() => {
      const has = Boolean(tokenStore.get());
      setIsAuthed((prev) => (prev !== has ? has : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Ctx.Provider
      value={{
        isAuthed,
        async login(email, password) {
          const r = await api.login(email, password);
          tokenStore.set(r.access_token);
          setIsAuthed(true);
        },
        logout() {
          tokenStore.clear();
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
