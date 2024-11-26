import { useUser } from "@/hooks/use-user";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export function Admin() {
  const { user } = useUser();

  if (!user?.isAdmin) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
