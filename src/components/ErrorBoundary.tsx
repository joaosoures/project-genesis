import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary] Render error:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl border bg-card shadow-lg">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 grid place-items-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black tracking-tight">Algo deu errado nesta tela</h2>
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado de renderização. Você pode tentar recarregar a tela ou voltar ao início.
              </p>
              {this.state.error?.message && (
                <p className="text-[11px] text-muted-foreground/70 font-mono mt-2 break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => { this.reset(); window.location.reload(); }} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Recarregar tela
              </Button>
              <Button variant="outline" onClick={() => { this.reset(); window.location.href = "/dashboard"; }} className="gap-2">
                <Home className="h-4 w-4" /> Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
