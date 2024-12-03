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
import { ServiceImage } from "@/types/project";

export default function ServiceImagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/service-images/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete service image');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceImages'] });
      toast({
        title: "Success",
        description: "Service image deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete service image",
        variant: "destructive",
      });
    },
  });
  const { data: serviceImages = [], isLoading } = useQuery<ServiceImage[]>({
    queryKey: ["serviceImages"],
    queryFn: async () => {
      const response = await fetch("/api/service-images");
      if (!response.ok) {
        throw new Error("Failed to fetch service images");
      }
      return response.json();
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Service Images</h1>
            <p className="text-muted-foreground">
              Manage service section images
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Image
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceImages.map((image) => (
                <TableRow key={image.id}>
                  <TableCell>
                    <img
                      src={image.imageUrl}
                      alt={image.caption || "Service image"}
                      className="h-12 w-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="capitalize">{image.serviceType}</TableCell>
                  <TableCell>{image.caption || "N/A"}</TableCell>
                  <TableCell>{image.displayOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this service image?")) {
                            deleteMutation.mutate(image.id);
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
