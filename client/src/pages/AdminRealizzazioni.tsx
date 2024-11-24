import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import type { Project } from "@/types/project";

export function AdminRealizzazioni() {
  const { logout } = useUser();
  const queryClient = useQueryClient();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<Omit<Project, "id">>({
    title: "",
    description: "",
    category: "restauro",
    location: "",
    year: new Date().getFullYear(),
    image: "",
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const response = await fetch("/api/admin/projects", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return response.json();
    },
  });

  const updateProject = useMutation({
    mutationFn: async (project: Project) => {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(project),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({
        title: "Successo",
        description: "Progetto aggiornato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento del progetto",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Successo",
        description: "Logout effettuato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il logout",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Gestione Realizzazioni</h1>
        <div className="flex gap-4">
          <Button 
            variant="default" 
            onClick={() => setShowNewProjectForm(true)}
            disabled={isSaving}
          >
            Nuovo Progetto
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Nuovo Progetto</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                try {
                  const response = await fetch("/api/admin/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(newProject),
                  });
                  
                  if (!response.ok) {
                    throw new Error("Failed to create project");
                  }
                  
                  queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
                  setShowNewProjectForm(false);
                  setNewProject({
                    title: "",
                    description: "",
                    category: "restauro",
                    location: "",
                    year: new Date().getFullYear(),
                    image: "",
                  });
                  setImagePreview(null);
                  
                  toast({
                    title: "Successo",
                    description: "Progetto creato con successo",
                  });
                } catch (error) {
                  toast({
                    title: "Errore",
                    description: "Errore nella creazione del progetto",
                    variant: "destructive",
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Titolo</label>
                <Input
                  value={newProject.title}
                  onChange={(e) =>
                    setNewProject({ ...newProject, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <Textarea
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  value={newProject.category}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      category: e.target.value as Project["category"],
                    })
                  }
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="restauro">Restauro</option>
                  <option value="costruzione">Costruzione</option>
                  <option value="ristrutturazione">Ristrutturazione</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={newProject.location}
                  onChange={(e) =>
                    setNewProject({ ...newProject, location: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Anno</label>
                <Input
                  type="number"
                  value={newProject.year}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      year: parseInt(e.target.value),
                    })
                  }
                  min="1900"
                  max={new Date().getFullYear()}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Immagine</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Preview
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);

                    // Upload
                    const formData = new FormData();
                    formData.append("image", file);

                    try {
                      setUploadProgress(0);
                      const response = await fetch("/api/upload-image", {
                        method: "POST",
                        body: formData,
                      });

                      if (!response.ok) {
                        throw new Error("Upload failed");
                      }

                      const { path } = await response.json();
                      setNewProject({ ...newProject, image: path });
                      setUploadProgress(100);

                      toast({
                        title: "Successo",
                        description: "Immagine caricata con successo",
                      });
                    } catch (error) {
                      toast({
                        title: "Errore",
                        description: "Errore nel caricamento dell'immagine",
                        variant: "destructive",
                      });
                      setUploadProgress(0);
                    }
                  }}
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs rounded-lg"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setImagePreview(null);
                    setUploadProgress(0);
                  }}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Salva Progetto
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects List and Edit Form */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Progetti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects?.map((project) => (
                <div
                  key={project.id}
                  className="p-4 border rounded hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <h3 className="font-medium">{project.title}</h3>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle>Modifica Progetto</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedProject) {
                    updateProject.mutate(selectedProject);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Titolo</label>
                  <Input
                    value={selectedProject.title}
                    onChange={(e) =>
                      setSelectedProject({ ...selectedProject, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrizione</label>
                  <Textarea
                    value={selectedProject.description}
                    onChange={(e) =>
                      setSelectedProject({ ...selectedProject, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={selectedProject.category}
                    onChange={(e) =>
                      setSelectedProject({
                        ...selectedProject,
                        category: e.target.value as Project["category"],
                      })
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="restauro">Restauro</option>
                    <option value="costruzione">Costruzione</option>
                    <option value="ristrutturazione">Ristrutturazione</option>
                  </select>
                </div>
                <Button type="submit">Salva Modifiche</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}