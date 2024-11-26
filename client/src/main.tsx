import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Home } from "./pages/Home";
import { Sostenibilita } from "./pages/Sostenibilita";
import { default as Certificazioni } from "./pages/Certificazioni";
import { CiPresentiamo } from "./pages/CiPresentiamo";
import { Servizi } from "./pages/Servizi";
import { Realizzazioni } from "./pages/Realizzazioni";
import { Admin } from "./pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sostenibilita" component={Sostenibilita} />
      <Route path="/certificazioni" component={Certificazioni} />
      <Route path="/ci-presentiamo" component={CiPresentiamo} />
      <Route path="/servizi" component={Servizi} />
      <Route path="/realizzazioni" component={Realizzazioni} />
      <Route path="/admin" component={Admin} />
      <Route>404 Page Not Found</Route>
    </Switch>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
