import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    let authEventReceived = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !authEventReceived) setSession(data.session);
      })
      .catch(() => {
        if (active && !authEventReceived) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        authEventReceived = true;
        if (active) {
          setSession(newSession);
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
