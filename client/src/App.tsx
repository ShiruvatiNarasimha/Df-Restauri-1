import { Route, Switch } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import TeamMembersPage from "@/pages/admin/team";
import ProjectsPage from "@/pages/admin/projects";
import ServiceImagesPage from "@/pages/admin/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        {/* Admin routes */}
        <Route path="/admin">
          {() => (
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          )}
        </Route>
        <Route path="/admin/team">
          {() => (
            <AdminLayout>
              <TeamMembersPage />
            </AdminLayout>
          )}
        </Route>
        <Route path="/admin/projects">
          {() => (
            <AdminLayout>
              <ProjectsPage />
            </AdminLayout>
          )}
        </Route>
        <Route path="/admin/services">
          {() => (
            <AdminLayout>
              <ServiceImagesPage />
            </AdminLayout>
          )}
        </Route>
      </Switch>
    </QueryClientProvider>
  );
}
