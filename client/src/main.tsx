import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { Home } from "./pages/Home";
import { Sostenibilita } from "./pages/Sostenibilita";
import { default as Certificazioni } from "./pages/Certificazioni";
import { CiPresentiamo } from "./pages/CiPresentiamo";
import { Servizi } from "./pages/Servizi";
import { Realizzazioni } from "./pages/Realizzazioni";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProjects from "@/pages/AdminProjects";
import AdminTeam from "@/pages/AdminTeam";
import AdminServices from "@/pages/AdminServices";

// Protected Route Component with TypeScript
interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  path?: string;
}

function ProtectedRoute({ component: Component, ...props }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  return <Component {...props} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sostenibilita" component={Sostenibilita} />
      <Route path="/certificazioni" component={Certificazioni} />
      <Route path="/ci-presentiamo" component={CiPresentiamo} />
      <Route path="/servizi" component={Servizi} />
      <Route path="/realizzazioni" component={Realizzazioni} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={(props) => <ProtectedRoute component={AdminDashboard} {...props} />} />
      <Route path="/admin/projects" component={(props) => <ProtectedRoute component={AdminProjects} {...props} />} />
      <Route path="/admin/team" component={(props) => <ProtectedRoute component={AdminTeam} {...props} />} />
      <Route path="/admin/services" component={(props) => <ProtectedRoute component={AdminServices} {...props} />} />
      
      <Route>404 Page Not Found</Route>
    </Switch>
  );
}

function App() {
  return (
    <StrictMode>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Router />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
