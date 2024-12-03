import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { TeamMember } from "@db/schema";

export default function TeamMembersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete team member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast({
        title: "Success",
        description: "Team member deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete team member",
        variant: "destructive",
      });
    },
  });

  const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const response = await fetch("/api/team-members");
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      return response.json();
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Team Members</h1>
            <p className="text-muted-foreground">
              Manage team member profiles
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this team member?")) {
                            deleteMutation.mutate(member.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
