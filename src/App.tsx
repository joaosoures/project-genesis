import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";
import LoadingPage from "@/components/LoadingPage";

// Lazy load pages for code splitting
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Estudo = lazy(() => import("@/pages/Estudo"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const BancoCards = lazy(() => import("@/pages/BancoCards"));
const GerarOQs = lazy(() => import("@/pages/GerarOQs"));
const Materiais = lazy(() => import("@/pages/Materiais"));
const Admin = lazy(() => import("@/pages/Admin"));
const AdminGerarAulas = lazy(() => import("@/pages/AdminGerarAulas"));
const TrilhaEstrategica = lazy(() => import("@/pages/TrilhaEstrategica"));
const MeuPlano = lazy(() => import("@/pages/MeuPlano"));
const Status = lazy(() => import("@/pages/Status"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const InstallPrompt = lazy(() => import("@/components/InstallPrompt"));


const qc = new QueryClient();

const App = () => (
  <QueryClientProvider client={qc}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<LoadingPage />}>
        <InstallPrompt />
      </Suspense>

      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <Suspense fallback={<LoadingPage />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/estudo" element={<Estudo />} />
                  <Route path="/trilha" element={<TrilhaEstrategica />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/favoritos" element={<Navigate to="/estudo?tipo=favoritos" replace />} />
                  <Route path="/banco-cards" element={<BancoCards />} />
                  <Route path="/gerar-oqs" element={<GerarOQs />} />
                  <Route path="/materiais" element={<Materiais />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/meu-plano" element={<MeuPlano />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                  <Route path="/gerar-oqs/aulas" element={<ProtectedRoute adminOnly><AdminGerarAulas /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
