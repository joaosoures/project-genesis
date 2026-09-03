/**
 * Captura ?ref=CODIGO da URL e persiste em localStorage.
 * Após login/signup, registra a indicação no backend.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "oqmed:ref";

export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^OQM-[A-Z0-9]{4,12}$/i.test(ref)) {
      localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
    }
  } catch {}
}

export function getStoredReferral(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function clearStoredReferral() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export async function registerStoredReferral() {
  const code = getStoredReferral();
  if (!code) return;
  try {
    const { data, error } = await supabase.functions.invoke("register-referral", {
      body: { referralCode: code },
    });
    if (!error && data?.ok) {
      clearStoredReferral();
    } else if (data?.reason && data.reason !== "no_code") {
      // Códigos já usados/inválidos não precisam permanecer
      if (["self_referral", "code_not_found", "already_referred", "invalid_code", "same_email"].includes(data.reason)) {
        clearStoredReferral();
      }
    }
  } catch (e) {
    console.warn("register-referral falhou", e);
  }
}

/** Hook usado em Login.tsx para capturar ref ao montar */
export function useReferralCapture() {
  useEffect(() => { captureReferralFromUrl(); }, []);
}
