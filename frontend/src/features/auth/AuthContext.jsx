import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "./api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let channel;
    const bootstrap = async () => {
      let isActiveSession = sessionStorage.getItem("active_session");

      if (!isActiveSession) {
        // Ping other tabs to see if a session is already active
        channel = new BroadcastChannel("auth_session");
        const hasOtherTabs = await new Promise((resolve) => {
          const onMessage = (e) => {
            if (e.data === "session_ping_response") resolve(true);
          };
          channel.addEventListener("message", onMessage);
          channel.postMessage("session_ping");
          setTimeout(() => resolve(false), 200);
        });

        if (hasOtherTabs) {
          sessionStorage.setItem("active_session", "true");
          isActiveSession = true;
        }
      }

      if (!isActiveSession) {
        try { await authApi.logout(); } catch {} // clear backend cookies
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await authApi.getProfile();
        setUser(data.data ?? null);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();

    channel = channel || new BroadcastChannel("auth_session");
    const handlePing = (e) => {
      if (e.data === "session_ping" && sessionStorage.getItem("active_session")) {
        channel.postMessage("session_ping_response");
      }
    };
    channel.addEventListener("message", handlePing);

    const handleAuthError = () => {
      setUser(null);
    };
    window.addEventListener("auth_error", handleAuthError);
    return () => {
      window.removeEventListener("auth_error", handleAuthError);
      channel.removeEventListener("message", handlePing);
      channel.close();
    };
  }, []);

  const loginWithTokens = useCallback((nextUser) => {
    sessionStorage.setItem("active_session", "true");
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // even if the API call fails, clear local session
    }
    sessionStorage.removeItem("active_session");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, setUser, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
