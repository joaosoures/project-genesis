import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null, user: null, loading: true, isAdmin: false, isBanned: false, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          if (s.user.email === 'joaoresende2603@gmail.com') {
            setIsAdmin(true);
          } else {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", s.user.id)
              .eq("role", "admin")
              .maybeSingle();
            setIsAdmin(!!roleData);
          }

          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_banned")
            .eq("id", s.user.id)
            .maybeSingle();
          
          if (profileData?.is_banned) {
            setIsBanned(true);
            await supabase.auth.signOut();
          } else {
            setIsBanned(false);
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setIsBanned(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        supabase.from("profiles")
          .select("is_banned")
          .eq("id", s.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.is_banned) {
              setIsBanned(true);
              supabase.auth.signOut();
            }
          });
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`user-profile-${session.user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${session.user.id}` 
        },
        (payload) => {
          if (payload.new && (payload.new as any).is_banned) {
            setIsBanned(true);
            supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isAdmin,
        isBanned,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
