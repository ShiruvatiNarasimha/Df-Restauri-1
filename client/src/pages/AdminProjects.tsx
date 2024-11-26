import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Project } from "@/types/project";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ProjectCategory } from "@/types/project";

const projectFormSchema = z.object({
  title: z.string()
    .min(1, "Il titolo è obbligatorio")
    .max(200, "Il titolo non può superare i 200 caratteri")
    .trim(),
  description: z.string()
    .min(1, "La descrizione è obbligatoria")
    .max(2000, "La descrizione non può superare i 2000 caratteri")
    .trim(),
  category: z.enum(["restauro", "costruzione", "ristrutturazione"] as const, {
    errorMap: () => ({ message: "Seleziona una categoria valida: restauro, costruzione o ristrutturazione" })
  }),
  year: z.number()
    .int("L'anno deve essere un numero intero")
    .min(1900, "L'anno deve essere successivo al 1900")
    .max(new Date().getFullYear(), "L'anno non può essere nel futuro"),
  location: z.string()
    .min(1, "La località è obbligatoria")
    .max(100, "La località non può superare i 100 caratteri")
    .trim(),
  image: z.instanceof(FileList)
    .refine(files => !files.length || files[0].type.startsWith('image/'), {
      message: "Il file deve essere un'immagine valida"
    })
    .optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

import { ImageOrderList } from "@/components/admin/ImageOrderList";

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "restauro" as const,
      year: new Date().getFullYear(),
      location: "",
    },
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAuthError = () => {
    const currentPath = window.location.pathname;
    window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  const fetchProjects = async (retryCount = 0) => {
    try {
      const token = await getToken();
      if (!token) {
        handleAuthError();
        return;
      }

      const response = await fetch("/api/projects", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        const newToken = await getToken(); // Try to refresh the token
        if (!newToken) {
          handleAuthError();
          return;
        }
        
        // Retry with new token
        const retryResponse = await fetch("/api/projects", {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!retryResponse.ok) {
          throw new Error('Failed to fetch projects after token refresh');
        }
        
        const data = await retryResponse.json();
        setProjects(data);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || 'Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Project fetch error:', error);
      
      // Retry logic for network errors
      if (retryCount < 3 && error instanceof Error && error.message.includes('network')) {
        console.log(`Retrying fetch attempt ${retryCount + 1}/3...`);
        setTimeout(() => fetchProjects(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      toast({
        title: "Error fetching projects",
        description: error instanceof Error 
          ? `Error: ${error.message}`
          : "Failed to fetch projects. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: ProjectFormValues) => {
    setIsLoading(true);
    const formData = new FormData();
    
    // Handle each field explicitly with proper typing
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("category", data.category);
    formData.append("year", data.year.toString());
    formData.append("location", data.location);
    
    if (data.image?.[0]) {
      formData.append("image", data.image[0]);
    }

    try {
      const token = await getToken();
      if (!token) {
        handleAuthError();
        return;
      }

      const url = isEditing && currentProject
        ? `/api/projects/${currentProject.id}`
        : "/api/projects";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.status === 401) {
        console.error('Authentication failed: Token may be expired');
        handleAuthError();
        return;
      }

      if (response.status === 403) {
        console.error('Authorization failed: Insufficient permissions');
        toast({
          title: "Error",
          description: "You don't have permission to perform this action",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        
        if (response.status === 403) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to perform this action",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData?.message || "Failed to save project");
      }

      toast({
        title: "Success",
        description: `Project ${isEditing ? "updated" : "created"} successfully`,
      });

      form.reset();
      setIsEditing(false);
      setCurrentProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Project save error:', error);
      
      if (error instanceof Error && error.message.includes('token')) {
        handleAuthError();
        return;
      }

      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to save project: ${error.message}`
          : "Failed to save project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (project: Project) => {
    setCurrentProject(project);
    setIsEditing(true);
    form.reset({
      title: project.title,
      description: project.description,
      category: project.category as ProjectCategory,
      year: project.year,
      location: project.location,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestione Progetti</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Progetto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Modifica Progetto" : "Nuovo Progetto"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          {...field}
                        >
                          <option value="restauro">Restauro</option>
                          <option value="costruzione">Costruzione</option>
                          <option value="ristrutturazione">Ristrutturazione</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anno</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Località</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Immagine</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files)}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {currentProject && (
                        <div className="mt-4">
                          <h3 className="text-lg font-medium mb-4">Gallery Images</h3>
                          <ImageOrderList
                            images={[
                              {
                                id: currentProject.id.toString(),
                                url: currentProject.image,
                                order: 1,
                              },
                              ...(currentProject.imageOrder || []).map(({id, order}) => ({
                                id,
                                url: `/uploads/${id}`,
                                order,
                              })),
                            ]}
                            onImageUpload={async (files) => {
                              const formData = new FormData();
                              Array.from(files).forEach((file) => {
                                formData.append('images', file);
                              });
                              
                              try {
                                const response = await fetch(
                                  `/api/projects/${currentProject.id}/images`,
                                  {
                                    method: 'POST',
                                    body: formData,
                                  }
                                );

                                if (!response.ok) throw new Error('Failed to upload images');

                                const data = await response.json();
                                fetchProjects();

                                toast({
                                  title: 'Success',
                                  description: 'Images uploaded successfully',
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to upload images',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            onChange={async (images) => {
                              try {
                                const token = localStorage.getItem('adminToken');
                                const response = await fetch(
                                  `/api/projects/${currentProject.id}/image-order`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                      imageOrder: images
                                        .filter(img => img.order !== undefined)
                                        .map((img) => ({
                                          id: img.id,
                                          order: img.order || 0,
                                        })),
                                    }),
                                  }
                                );

                                if (!response.ok) throw new Error("Failed to update image order");

                                toast({
                                  title: "Success",
                                  description: "Image order updated successfully",
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to update image order",
                                  variant: "destructive",
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading 
                    ? "Salvataggio in corso..." 
                    : `${isEditing ? "Aggiorna" : "Crea"} Progetto`}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titolo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Anno</TableHead>
            <TableHead>Località</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>{project.title}</TableCell>
              <TableCell>{project.category}</TableCell>
              <TableCell>{project.year}</TableCell>
              <TableCell>{project.location}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(project)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
