import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Image, FolderOpen, LogOut } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();

  // TODO: Implement actual authentication check
  const isAuthenticated = true;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, navigate]);

  const menuItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin",
    },
    {
      label: "Team Members",
      icon: Users,
      href: "/admin/team",
    },
    {
      label: "Projects",
      icon: FolderOpen,
      href: "/admin/projects",
    },
    {
      label: "Service Images",
      icon: Image,
      href: "/admin/services",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <span className="font-semibold">DF Restauri Admin</span>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => (
              <Button
                key={item.href}
                variant={location === item.href ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => navigate(item.href)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
          <div className="border-t p-4">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="h-full min-h-screen bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
