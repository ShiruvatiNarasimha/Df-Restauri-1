import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth";
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
import Login from "@/pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sostenibilita" component={Sostenibilita} />
      <Route path="/certificazioni" component={Certificazioni} />
      <Route path="/ci-presentiamo" component={CiPresentiamo} />
      <Route path="/servizi" component={Servizi} />
      <Route path="/realizzazioni" component={Realizzazioni} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/projects" component={AdminProjects} />
      <Route path="/admin/team" component={AdminTeam} />
      <Route path="/admin/services" component={AdminServices} />
      <Route>404 Page Not Found</Route>
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement?.innerHTML) {
  const root = createRoot(rootElement!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}