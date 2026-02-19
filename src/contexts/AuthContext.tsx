import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import type { GoogleUser } from "@/types/auth";

const AUTH_STORAGE_KEY = "pgxcds_google_user";

interface AuthContextValue {
  user: GoogleUser | null;
  isInitialized: boolean;
  setUserFromCredential: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleUser;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function saveUser(user: GoogleUser) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setUser(loadStoredUser());
    setIsInitialized(true);
  }, []);

  const setUserFromCredential = useCallback((credential: string) => {
    const decoded = jwtDecode(credential) as GoogleUser;
    const userInfo: GoogleUser = {
      sub: decoded.sub,
      email: decoded.email ?? "",
      email_verified: decoded.email_verified ?? false,
      name: decoded.name ?? "",
      picture: decoded.picture ?? "",
      given_name: decoded.given_name,
      family_name: decoded.family_name,
    };
    saveUser(userInfo);
    setUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isInitialized,
    setUserFromCredential,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
