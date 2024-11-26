import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { TeamMemberForm } from "./TeamMemberForm";
import { ProjectForm } from "./ProjectForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, FolderKanban, LogOut } from "lucide-react";

type Tab = "team" | "projects";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("team");
  const { logout } = useUser();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il logout",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex space-x-4 mb-8">
          <Button
            variant={activeTab === "team" ? "default" : "outline"}
            onClick={() => setActiveTab("team")}
          >
            <Users className="h-5 w-5 mr-2" />
            Team
          </Button>
          <Button
            variant={activeTab === "projects" ? "default" : "outline"}
            onClick={() => setActiveTab("projects")}
          >
            <FolderKanban className="h-5 w-5 mr-2" />
            Progetti
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          {activeTab === "team" ? <TeamMemberForm /> : <ProjectForm />}
        </div>
      </main>
    </div>
  );
}
