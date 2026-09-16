import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "./AuthContext.jsx";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setChecking(false);
      });
  }, [user]);

  return { isAdmin, checking };
}
