import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { LogOut, Loader2, X } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/use-user";
import type { Project } from "@/types/project";

export function AdminRealizzazioni() {
  const { logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageUpload = async (files: File[]) => {
    const totalFiles = files.length;
    const uploadedPaths: string[] = [];
    let completedFiles = 0;

    for (const file of files) {
      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error("Il file deve essere un'immagine");
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("L'immagine deve essere inferiore a 5MB");
        }

        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await response.text() || `Caricamento fallito per ${file.name}`);
        }

        const { path } = await response.json();
        if (!path || typeof path !== 'string') {
          throw new Error('Percorso immagine non valido');
        }

        uploadedPaths.push(path);
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);

        // Add preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);

      } catch (error) {
        toast({
          title: "Errore",
          description: error instanceof Error ? error.message : 'Errore nel caricamento',
          variant: "destructive",
        });
      }
    }

    if (uploadedPaths.length > 0) {
      setNewProject(prev => ({
        ...prev,
        gallery: [...(prev.gallery || []), ...uploadedPaths],
      }));
    }
    setUploadProgress(0);
  };
  const [newProject, setNewProject] = useState<Omit<Project, "id">>({
    title: "",
    description: "",
    category: "restauro",
    location: "",
    year: new Date().getFullYear(),
    image: "",
    gallery: [], // Added gallery initialization
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
                    headers: { 
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(newProject),
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    if (response.status === 401) {
                      throw new Error("Non sei autorizzato a creare progetti");
                    }
                    throw new Error(errorText || "Errore nella creazione del progetto");
                  }
                  
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
                <label className="block text-sm font-medium mb-1">Immagini</label>
                <Dropzone
                  onDrop={handleImageUpload}
                  isUploading={uploadProgress > 0}
                  progress={uploadProgress}
                  className="mb-4"
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setImagePreviews(prev => prev.filter((_, i) => i !== index));
                            setNewProject(prev => ({
                              ...prev,
                              gallery: prev.gallery ? prev.gallery.filter((_, i) => i !== index) : [],
                            }));
                          }}
                          className="absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
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