import { supabase } from "@/integrations/supabase/client";
import { registrarDesempenho } from "./queue";

const SYNC_KEY = "oqmed.sync_queue";

interface SyncItem {
  userId: string;
  cardId: string;
  acertou: boolean;
  nivelPista: number;
  nota: number;
  pesoImportancia: number;
  timestamp: string;
}

export function addToSyncQueue(item: Omit<SyncItem, "timestamp">) {
  const queue = getSyncQueue();
  queue.push({ ...item, timestamp: new Date().toISOString() });
  localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
}

export function getSyncQueue(): SyncItem[] {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function processSyncQueue() {
  if (!navigator.onLine) return;
  
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const remainingQueue: SyncItem[] = [];
  
  for (const item of queue) {
    try {
      await registrarDesempenho(item);
    } catch (error) {
      console.error("Failed to sync OQ result:", error);
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(SYNC_KEY, JSON.stringify(remainingQueue));
}

// Listen for online status to trigger sync
if (typeof window !== "undefined") {
  window.addEventListener("online", processSyncQueue);
}
