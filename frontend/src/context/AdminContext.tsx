import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axios from "axios";

interface Admin {
  email: string;
}

interface AdminContextValue {
  admin: Admin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

  useEffect(() => {
    const checkAdminSession = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setAdmin(response.data.admin);
        } else {
          localStorage.removeItem("admin_token");
        }
      } catch {
        localStorage.removeItem("admin_token");
      } finally {
        setIsLoading(false);
      }
    };

    void checkAdminSession();
  }, [API_BASE_URL]);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/api/admin/login`, { email, password });
    if (response.data.success) {
      localStorage.setItem("admin_token", response.data.token);
      setAdmin(response.data.admin);
    }
  };

  const logout = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/admin/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        // Ignore errors
      }
    }
    localStorage.removeItem("admin_token");
    setAdmin(null);
  };

  return (
    <AdminContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
