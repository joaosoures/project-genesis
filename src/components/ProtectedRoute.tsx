import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { session, loading, isAdmin, isBanned } = useAuth();
  
  if (loading) return <div className="grid place-items-center min-h-screen text-muted-foreground">Carregando…</div>;
  
  if (!session || isBanned) return <Navigate to="/login" replace />;
  
  // Temporary bypass for Admin access during configuration
  if (adminOnly && !isAdmin && session?.user?.email !== 'joaoresende2603@gmail.com') return <Navigate to="/estudo" replace />;
  return <>{children}</>;
}
