import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface UserProfile {
  is_vip: boolean;
  credits: number;
  is_blocked: boolean;
  has_3d_access: boolean;
  total_exposes: number;
  last_online: string | null;
  total_paid: number;
  payment_plan: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultProfile: UserProfile = {
  is_vip: false,
  credits: 0,
  is_blocked: false,
  has_3d_access: false,
  total_exposes: 0,
  last_online: null,
  total_paid: 0,
  payment_plan: "Free",
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_vip, credits, is_blocked, has_3d_access, total_exposes, last_online, total_paid, payment_plan")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data ? (data as unknown as UserProfile) : defaultProfile);

    // Update last_online
    await supabase
      .from("profiles")
      .update({ last_online: new Date().toISOString() })
      .eq("user_id", userId);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          checkAdmin(session.user.id);
          loadProfile(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      // Check if blocked
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (prof?.is_blocked) {
        await supabase.auth.signOut();
        return { error: { message: "Ihr Account wurde gesperrt. Bitte kontaktieren Sie den Support." } };
      }
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, refreshProfile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
