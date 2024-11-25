import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, X, LogOut, Loader2 } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import type { Project, CreateProject } from "@/types/project";
import type { TeamMember, CreateTeamMember } from "@/types/team";
import { useUser } from "@/hooks/use-user";

interface DropzoneProps {
  onDrop: (files: File[]) => Promise<void>;
  accept: Record<string, string[]>;
  maxFiles: number;
  className?: string;
}

// Authentication error handling
const handleAuthError = (error: { response?: { status: number }, message?: string }) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    window.location.href = "/login";
  }
};

export function AdminRealizzazioni() {
  const [location, setLocation] = useLocation();
  const { logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch("/api/admin/team-members", {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error("Failed to fetch team members");
        }
        
        const data = await response.json();
        setTeamMembers(data);
      } catch (error) {
        toast({
          title: "Errore",
          description: error instanceof Error ? error.message : "Failed to fetch team members",
          variant: "destructive",
        });
      }
    };
    
    fetchTeamMembers();
  }, []);
// Team management state and handlers
const [newTeamMember, setNewTeamMember] = useState<CreateTeamMember>({
  name: "",
  role: "",
  avatar: "",
  facebookUrl: "",
  twitterUrl: "",
  instagramUrl: ""
});

const createTeamMember = useMutation({
  mutationFn: async (member: CreateTeamMember) => {
    const response = await fetch("/api/admin/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(member),
    });

    if (!response.ok) {
      throw new Error("Failed to create team member");
    }

    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
    toast({
      title: "Successo",
      description: "Membro del team aggiunto con successo",
    });
    setNewTeamMember({
      name: "",
      role: "",
      avatar: "",
      facebookUrl: "",
      twitterUrl: "",
      instagramUrl: ""
    });
  },
  onError: (error) => {
    toast({
      title: "Errore",
      description: error instanceof Error ? error.message : "Errore nella creazione del membro del team",
      variant: "destructive",
    });
  },
});

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

  const [showTeamForm, setShowTeamForm] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);

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
      setNewProject((prev: CreateProject) => {
        const updatedGallery = [...(prev.gallery || []), ...data.files.map(f => f.optimizedPath)];
        return {
          ...prev,
          image: prev.image || (updatedGallery[0] || ''), // Set first image as main image if not set
          gallery: updatedGallery,
        };
      });

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
  
  const initialProject: CreateProject = {
    title: "",
    description: "",
    category: "restauro",
    location: "",
    year: new Date().getFullYear(),
    image: "",
    gallery: [],
    status: "draft" as const
  };
  
  const [newProject, setNewProject] = useState<CreateProject>(initialProject);

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const response = await fetch("/api/admin/projects", {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch projects");
      }
      
      return response.json();
    },
    retry: false
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
    <div className="border-2 border-primary/20 rounded-lg p-6 bg-secondary/5 mb-8">
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-primary mb-2">Immagini Restauro</h3>
          <p className="text-muted-foreground">
            Carica le immagini del progetto di restauro. Le immagini saranno ottimizzate automaticamente.
            La prima immagine caricata sarà utilizzata come immagine principale del progetto.
            Formati supportati: PNG, JPG, JPEG, WebP. Dimensione massima: 5MB per file.
          </p>
        </div>
        
        <Dropzone
          onDrop={handleImageUpload}
          accept={{
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp']
          }}
          maxFiles={10}
          className="border-2 border-dashed border-primary/40 hover:border-primary transition-colors p-8 rounded-lg text-center cursor-pointer"
        >
          <div className="space-y-2">
            <UploadCloud className="w-12 h-12 mx-auto text-primary/60" />
            <p className="font-medium">Trascina le immagini qui o clicca per selezionarle</p>
            <p className="text-sm text-muted-foreground">Massimo 10 file, 5MB per file</p>
          </div>
        </Dropzone>

        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Caricamento in corso...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {newProject.gallery.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Immagini caricate ({newProject.gallery.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {newProject.gallery.map((image: string, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-border"
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
                  {index === 0 && (
                    <span className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded-md text-xs">
                      Principale
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
            <form
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
                    status: "draft"
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
              className="space-y-6"
            >
              <RestauroImageSection />
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Informazioni Progetto</h3>
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
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Progetti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(projects) && projects.map((project: Project) => (
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

      {/* Team Management Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Gestione Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* New Team Member Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                
                const memberData = {
                  name: formData.get('name') as string,
                  role: formData.get('role') as string,
                  avatar: formData.get('avatar') as string,
                  facebookUrl: formData.get('facebookUrl') as string,
                  twitterUrl: formData.get('twitterUrl') as string,
                  instagramUrl: formData.get('instagramUrl') as string,
                };

                try {
                  const response = await fetch("/api/admin/team-members", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Accept": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(memberData),
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
                    throw new Error(errorData?.error || "Errore nella creazione del membro del team");
                  }

                  queryClient.invalidateQueries({ queryKey: ["team-members"] });
                  form.reset();
                  toast({
                    title: "Successo",
                    description: "Membro del team aggiunto con successo",
                  });
                } catch (error) {
                  console.error('Team member creation error:', error);
                  toast({
                    title: "Errore",
                    description: error instanceof Error ? error.message : "Errore nella creazione del membro del team",
                    variant: "destructive",
                  });
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ruolo</label>
                  <Input name="role" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL Avatar</label>
                <Input name="avatar" type="url" required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Facebook URL</label>
                  <Input name="facebookUrl" type="url" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter URL</label>
                  <Input name="twitterUrl" type="url" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Instagram URL</label>
                  <Input name="instagramUrl" type="url" />
                </div>
              </div>
              <Button type="submit">Aggiungi Membro</Button>
            </form>

            {/* Team Members List */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Membri del Team</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers?.map((member) => (
                  <div key={member.id} className="border rounded-lg p-4">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                    />
                    <h4 className="font-medium text-center">{member.name}</h4>
                    <p className="text-sm text-center text-muted-foreground mb-4">{member.role}</p>
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/admin/team-members/${member.id}`, {
                              method: "DELETE",
                              credentials: "include",
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
                              throw new Error(errorData?.error || "Errore nell'eliminazione del membro");
                            }

                            queryClient.invalidateQueries({ queryKey: ["team-members"] });
                            toast({
                              title: "Successo",
                              description: "Membro del team eliminato con successo",
                            });
                          } catch (error) {
                            console.error('Team member deletion error:', error);
                            toast({
                              title: "Errore",
                              description: error instanceof Error ? error.message : "Errore nell'eliminazione del membro",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Elimina
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}