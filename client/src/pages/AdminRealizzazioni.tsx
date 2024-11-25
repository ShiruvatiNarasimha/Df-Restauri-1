import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { LogOut, Loader2, X } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import type { Project } from "@/types/project";

export function AdminRealizzazioni() {
  const { logout } = useUser();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Handle authentication errors
  const handleAuthError = (error: any) => {
    console.error('Authentication error:', error);
    if (error?.response?.status === 401 || 
        error?.response?.status === 403 || 
        error?.requiresLogin || 
        error?.code === 'SESSION_INVALID' || 
        error?.code === 'SESSION_EXPIRED' || 
        error?.code === 'NOT_AUTHENTICATED') {
      setIsSessionExpired(true);
      toast({
        title: "Errore di autenticazione",
        description: "Non sei autenticato. Per favore, effettua il login.",
        variant: "destructive",
      });
      setLocation('/login');
    }
  };

  const queryClient = useQueryClient();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  interface UploadResponse {
    success: boolean;
    files: Array<{
      name: string;
      originalPath: string;
      optimizedPath: string;
      responsiveSizes: Record<string, string>;
      metadata: {
        width: number;
        height: number;
        format: string;
        size: number;
      };
    }>;
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    errors?: Array<{
      name: string;
      error: string;
    }>;
  }

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadProgress(0);
    setImagePreviews([]);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        }
      };

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              try {
                const response = JSON.parse(xhr.responseText);
                // Validate response structure
                if (!response || typeof response !== 'object') {
                  throw new Error('Formato risposta non valido: risposta non è un oggetto');
                }
                
                if (typeof response.success !== 'boolean') {
                  throw new Error('Formato risposta non valido: campo success mancante o non booleano');
                }
                
                if (!Array.isArray(response.files)) {
                  throw new Error('Formato risposta non valido: campo files mancante o non array');
                }
                
                // Validate files array structure
                response.files.forEach((file: any, index: number) => {
                  if (!file.name || !file.originalPath || !file.optimizedPath || !file.responsiveSizes || !file.metadata) {
                    throw new Error(`File ${index + 1}: campi obbligatori mancanti`);
                  }
                  
                  if (!file.metadata.width || !file.metadata.height || !file.metadata.format || !file.metadata.size) {
                    throw new Error(`File ${index + 1}: campi metadata incompleti`);
                  }
                });
                
                if (typeof response.totalFiles !== 'number' || 
                    typeof response.successfulFiles !== 'number' || 
                    typeof response.failedFiles !== 'number') {
                  throw new Error('Formato risposta non valido: campi contatori mancanti o non numerici');
                }
                
                resolve(response as UploadResponse);
              } catch (parseError) {
                reject(new Error(`Errore nel parsing della risposta: ${parseError instanceof Error ? parseError.message : 'Errore sconosciuto'}`));
              }
            } catch (error) {
              reject(new Error('Formato risposta non valido'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              if (errorData.code === 'INVALID_FILES') {
                const details = errorData.details.map((detail: any) => 
                  `${detail.name}: ${detail.reason}`
                ).join('\n');
                reject(new Error(`File non validi:\n${details}`));
              } else {
                reject(new Error(errorData.error || 'Caricamento fallito'));
              }
            } catch {
              reject(new Error(`Caricamento fallito con stato ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error('Errore di rete'));
        xhr.ontimeout = () => reject(new Error('Timeout della richiesta'));
        
        xhr.open('POST', '/api/upload-images');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 30000; // 30 seconds timeout
        xhr.send(formData);
      });

      const data = response as { 
        success: boolean; 
        totalFiles: number;
        successfulFiles: number;
        failedFiles: number;
        files: Array<{
          name: string;
          originalPath: string;
          optimizedPath: string;
          responsiveSizes: Record<string, string>;
          metadata: {
            width: number;
            height: number;
            format: string;
            size: number;
          };
        }>;
        errors?: Array<{
          name: string;
          error: string;
        }>;
      };

      if (!data.success) {
        throw new Error(
          data.errors ? 
            `Alcuni file non sono stati caricati:\n${data.errors.map(e => `${e.name}: ${e.error}`).join('\n')}` :
            'Caricamento fallito'
        );
      }

      // Add optimized paths to the project gallery
      setNewProject(prev => ({
        ...prev,
        gallery: [...(prev.gallery || []), ...data.files.map(f => f.optimizedPath)],
      }));

      // Generate previews for successful uploads
      const successfulFiles = files.filter(file => 
        data.files.some(f => f.name === file.name)
      );

      successfulFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Show success message with details
      toast({
        title: "Successo",
        description: data.failedFiles > 0 
          ? `${data.successfulFiles} su ${data.totalFiles} immagini caricate con successo`
          : `${data.successfulFiles} immagini caricate con successo`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      toast({
        title: "Errore nel caricamento",
        description: error instanceof Error 
          ? error.message 
          : 'Si è verificato un errore durante il caricamento delle immagini',
        variant: "destructive",
      });
      
    } finally {
      setUploadProgress(0);
    }
  };
  
  const [newProject, setNewProject] = useState<Omit<Project, "id" | "createdAt" | "updatedAt">>({
    title: "",
    description: "",
    category: "restauro",
    location: "",
    year: new Date().getFullYear(),
    image: "",
    gallery: [],
    status: "draft"
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    onError: (error: unknown) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleAuthError(error);
      } else {
        toast({
          title: "Errore",
          description: "Errore nel caricamento dei progetti",
          variant: "destructive",
        });
      }
    },
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/projects", {
          credentials: "include",
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (response.status === 401 || response.status === 403) {
          const error = await response.json();
          throw new Error(error.error || 'Authentication error');
        }

        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        return response.json();
      } catch (error) {
        if (error instanceof Error && (error.message.includes('Authentication') || error.message.includes('authorized'))) {
          // Handle authentication errors
          setLocation('/'); // Redirect to home on auth error
        }
        throw error;
      }
    },
    retry: (failureCount: number, error: Error) => {
      // Don't retry on authentication errors
      if (error.message.includes('Authentication') || error.message.includes('authorized')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const updateProject = useMutation<Project, Error, Project>({
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

  const handleReorderImages = (startIndex: number, endIndex: number) => {
    setNewProject(prev => {
      const newGallery = [...prev.gallery];
      const [removed] = newGallery.splice(startIndex, 1);
      newGallery.splice(endIndex, 0, removed);
      return { ...prev, gallery: newGallery };
    });
  };

  const handleRemoveImage = (index: number) => {
    setNewProject(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const RestauroImageSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-2">Immagini Restauro</h3>
      <Dropzone
        onDrop={handleImageUpload}
        accept={{
          'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        }}
        maxFiles={10}
      />
      {uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {newProject.gallery.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={image}
              alt={`Preview ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
            <RestauroImageSection />
            <form className="mt-8"
              onSubmit={async (e) => {
                e.preventDefault();
                
                // Validate required fields
                const requiredFields = ['title', 'description', 'category', 'location', 'year'] as const;
                const missingFields = requiredFields.filter(field => !newProject[field]);
                
                if (missingFields.length > 0) {
                  toast({
                    title: "Errore di validazione",
                    description: `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
                    variant: "destructive",
                  });
                  return;
                }

                // Validate year
                const currentYear = new Date().getFullYear();
                if (newProject.year < 1900 || newProject.year > currentYear) {
                  toast({
                    title: "Errore di validazione",
                    description: `L'anno deve essere compreso tra 1900 e ${currentYear}`,
                    variant: "destructive",
                  });
                  return;
                }

                // Validate gallery images
                if (!newProject.gallery?.length) {
                  toast({
                    title: "Errore di validazione",
                    description: "È necessario caricare almeno un'immagine",
                    variant: "destructive",
                  });
                  return;
                }

                setIsSaving(true);
                try {
                  // Before making the API call, ensure we have an image
                  if (!newProject.gallery?.length) {
                    toast({
                      title: "Errore di validazione",
                      description: "È necessario caricare almeno un'immagine",
                      variant: "destructive",
                    });
                    return;
                  }

                  const imageFromGallery = newProject.gallery[0];
                  const projectData = {
                    ...newProject,
                    image: imageFromGallery, // Set image field explicitly
                    gallery: newProject.gallery,
                    status: 'published'
                  };

                  const response = await fetch("/api/admin/projects", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "Accept": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(projectData),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    if (response.status === 401 || response.status === 403) {
                      handleAuthError({
                        response: { status: response.status },
                        ...errorData
                      });
                      return;
                    }
                    throw new Error(errorData?.error || "Errore nella creazione del progetto");
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
                    gallery: [],
                  });
                  setImagePreviews([]);

                  toast({
                    title: "Successo",
                    description: "Progetto creato con successo",
                  });
                } catch (error) {
                  console.error('Project creation error:', error);
                  toast({
                    title: "Errore",
                    description: error instanceof Error 
                      ? error.message 
                      : "Errore nella creazione del progetto",
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
                    setImagePreviews([]);
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
              {projects?.map((project: Project) => (
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