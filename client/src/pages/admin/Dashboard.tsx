import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Image, FolderOpen } from "lucide-react";

export default function AdminDashboard() {
  const menuItems = [
    {
      title: "Team Members",
      description: "Manage team member profiles",
      icon: Users,
      href: "/admin/team",
    },
    {
      title: "Projects",
      description: "Manage project portfolio",
      icon: FolderOpen,
      href: "/admin/projects",
    },
    {
      title: "Service Images",
      description: "Manage service images",
      icon: Image,
      href: "/admin/services",
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your website content
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Card key={item.href} className="hover:shadow-lg transition-shadow">
            <Link href={item.href}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <item.icon className="w-6 h-6 text-primary" />
                  <CardTitle>{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">
                  Manage {item.title}
                </Button>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
