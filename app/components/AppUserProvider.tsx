"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppRole } from "../../lib/roles";

type MePayload = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  canWrite: boolean;
  isAdmin: boolean;
};

type AppUserContextValue = {
  user: MePayload | null;
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  canWrite: boolean;
  isAdmin: boolean;
  isViewer: boolean;
};

const AppUserContext = createContext<AppUserContextValue | null>(null);

export function AppUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/me");
      if (response.status === 403) {
        setUser(null);
        setError("Your Clerk account is not linked to an active SiteScope user.");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const payload = (await response.json()) as MePayload;
      setUser(payload);
    } catch {
      setUser(null);
      setError("Unable to load your SiteScope profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AppUserContextValue>(
    () => ({
      user,
      isLoading,
      error,
      refresh,
      canWrite: Boolean(user?.canWrite),
      isAdmin: Boolean(user?.isAdmin),
      isViewer: user?.role === "viewer",
    }),
    [user, isLoading, error, refresh]
  );

  return <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>;
}

export function useAppUser(): AppUserContextValue {
  const ctx = useContext(AppUserContext);
  if (!ctx) {
    throw new Error("useAppUser must be used within AppUserProvider");
  }
  return ctx;
}
