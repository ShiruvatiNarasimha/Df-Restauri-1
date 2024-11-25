import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Briefcase, 
  Wrench,
  Plus 
} from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Progetti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Gestisci i progetti e le realizzazioni
            </p>
            <Link href="/admin/projects">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Gestisci Progetti
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Gestisci i membri del team
            </p>
            <Link href="/admin/team">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Gestisci Team
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Servizi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Gestisci i servizi offerti
            </p>
            <Link href="/admin/services">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Gestisci Servizi
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
