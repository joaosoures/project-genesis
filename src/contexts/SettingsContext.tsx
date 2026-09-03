import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";




export type ThemeMode = "light" | "dark";

export interface Settings {
  theme: ThemeMode;
  sound: boolean;
  soundVolume: number; // 0..1
  haptics: boolean;
  notifications: boolean;
  focusMode: boolean;
  dailyGoal: number;
  reduceMotion: boolean;
  fontScale: number; // 0.9 .. 1.25
  // Painel de Comando
  consoleLayout: ("scroll" | "hint" | "confirm")[];
  scrollStyle: string;
  hintStyle: string;
  confirmStyle: string;
  useNativeScroll: boolean;
}

const getInitialReduceMotion = () => {
  if (typeof window === "undefined") return false;
  
  // 1. Check localStorage first
  try {
    const raw = localStorage.getItem("oqmed.settings.v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.reduceMotion === 'boolean') return parsed.reduceMotion;
    }
  } catch {}

  // 2. Automatic detection for PC/Desktop or Preview
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  const isPreview = window.location.hostname.includes('lovable.app');
  
  return isDesktop || isPreview;
};

const DEFAULTS: Settings = {
  theme: "light",
  sound: true,
  soundVolume: 0.8, // Padrão 4 de 5 (0.2, 0.4, 0.6, 0.8, 1.0)
  haptics: true,
  notifications: true,
  focusMode: false,
  dailyGoal: 20,
  reduceMotion: getInitialReduceMotion(),
  fontScale: 1,
  consoleLayout: ["hint", "confirm", "scroll"],
  scrollStyle: "default",
  hintStyle: "default",
  confirmStyle: "default",
  useNativeScroll: false,
};

const KEY = "oqmed.settings.v1";

interface Ctx extends Settings {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [s, setS] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });
  const hydratedRef = useRef(false);
  const userDirtyRef = useRef(false);

  // Hydration from Supabase on login
  useEffect(() => {
    async function loadRemoteSettings() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (data?.settings) {
        // Explicitly cast settings since Json can be an object
        const remoteSettings = data.settings as unknown as Partial<Settings>;
        const merged = { ...DEFAULTS, ...remoteSettings };
        setS(merged);
        localStorage.setItem(KEY, JSON.stringify(merged));
      }
      hydratedRef.current = true;
    }
    loadRemoteSettings();
  }, [user]);

  // Sync back to Supabase when settings change (only after hydration and only on user-driven changes)
  useEffect(() => {
    if (!hydratedRef.current || !userDirtyRef.current || !user) return;
    userDirtyRef.current = false;

    let cancelled = false;
    async function syncRemoteSettings() {
      // Fetch current settings to avoid overwriting other keys (like 'trilha')
      const { data } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("usuario_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const existing = (data?.settings as any) || {};
      const payload = {
        usuario_id: user.id,
        settings: { ...existing, ...s },
        atualizado_em: new Date().toISOString()
      };

      await supabase.from("user_settings").upsert(payload, { onConflict: "usuario_id" });
    }
    syncRemoteSettings();
    return () => { cancelled = true; };
  }, [s, user]);


  const isExternal = useMemo(() => ["/", "/login"].includes(location.pathname), [location.pathname]);

  // Se for externo, usamos os DEFAULTS, senão as configurações do usuário
  const activeSettings = useMemo(() => isExternal ? DEFAULTS : s, [isExternal, s]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    const root = document.documentElement;
    
    // Tema dark apenas se não for externo E o tema for dark nas configurações ativas
    root.classList.toggle("dark", activeSettings.theme === "dark");
    root.style.fontSize = `${Math.round(activeSettings.fontScale * 100)}%`;
    root.dataset.reduceMotion = activeSettings.reduceMotion ? "1" : "0";
    (window as any).__OQ_SETTINGS__ = activeSettings;
  }, [s, activeSettings]);

  return (
    <SettingsCtx.Provider value={{
      ...activeSettings,
      set: (k, v) => { userDirtyRef.current = true; setS(prev => ({ ...prev, [k]: v })); },
      reset: () => { userDirtyRef.current = true; setS(DEFAULTS); },
    }}>
      {children}
    </SettingsCtx.Provider>

  );
}



export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

export function readSettings(): Settings {
  return ((typeof window !== "undefined" && (window as any).__OQ_SETTINGS__) as Settings) || DEFAULTS;
}
