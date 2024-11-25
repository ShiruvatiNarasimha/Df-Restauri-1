import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Project } from "@db/schema";
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

const projectFormSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().min(1, "La descrizione è obbligatoria"),
  category: z.string().min(1, "La categoria è obbligatoria"),
  year: z.string().min(1, "L'anno è obbligatorio"),
  location: z.string().min(1, "La località è obbligatoria"),
  image: z.any(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

import { ImageOrderList } from "@/components/admin/ImageOrderList";

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      year: "",
      location: "",
    },
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: ProjectFormValues) => {
    const formData = new FormData();
    
    // Handle each field explicitly with proper typing
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("category", data.category);
    formData.append("year", data.year);
    formData.append("location", data.location);
    
    if (data.image?.[0]) {
      formData.append("image", data.image[0]);
    }

    try {
      const url = isEditing && currentProject
        ? `/api/projects/${currentProject.id}`
        : "/api/projects";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save project");

      toast({
        title: "Success",
        description: `Project ${isEditing ? "updated" : "created"} successfully`,
      });

      form.reset();
      setIsEditing(false);
      setCurrentProject(null);
      fetchProjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (project: Project) => {
    setCurrentProject(project);
    setIsEditing(true);
    form.reset({
      title: project.title,
      description: project.description,
      category: project.category,
      year: project.year.toString(),
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
                        <Input {...field} />
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
                              ...(currentProject.gallery || []).map((url, index) => ({
                                id: `${currentProject.id}-${index + 1}`,
                                url,
                                order: index + 2,
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
                                const response = await fetch(
                                  `/api/projects/${currentProject.id}/image-order`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
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
                <Button type="submit" className="w-full">
                  {isEditing ? "Aggiorna" : "Crea"} Progetto
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
