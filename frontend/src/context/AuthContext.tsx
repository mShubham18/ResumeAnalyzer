import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        localStorage.removeItem("auth_token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    login: async (email: string, password: string) => {
      const auth = await loginUser({ email, password });
      localStorage.setItem("auth_token", auth.token);
      setUser(auth.user);
    },
    register: async (fullName: string, email: string, password: string) => {
      const auth = await registerUser({ full_name: fullName, email, password });
      localStorage.setItem("auth_token", auth.token);
      setUser(auth.user);
    },
    logout: async () => {
      try {
        await logoutUser();
      } finally {
        localStorage.removeItem("auth_token");
        setUser(null);
      }
    },
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
