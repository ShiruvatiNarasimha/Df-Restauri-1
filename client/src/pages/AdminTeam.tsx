import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";

// Error boundary component
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Caught in error boundary:', error);
      setHasError(true);
      toast({
        title: "Errore dell'applicazione",
        description: "Si è verificato un errore imprevisto. Ricarica la pagina.",
        variant: "destructive",
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [toast]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Qualcosa è andato storto</h2>
        <p className="text-gray-600 mb-4">Si è verificato un errore imprevisto.</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Ricarica la pagina
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

interface SocialLink {
  platform: string;
  url: string;
}

// Form validation schemas
const socialLinkSchema = z.object({
  platform: z.string()
    .min(1, "La piattaforma è obbligatoria")
    .max(50, "Il nome della piattaforma non può superare i 50 caratteri")
    .refine(
      (val) => ['facebook', 'twitter', 'instagram', 'linkedin'].includes(val.toLowerCase()),
      "Piattaforma non supportata. Usa Facebook, Twitter, Instagram o LinkedIn"
    ),
  url: z.string()
    .url("Inserisci un URL valido")
    .max(255, "L'URL non può superare i 255 caratteri")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      "L'URL deve iniziare con http:// o https://"
    )
});

const teamFormSchema = z.object({
  name: z.string()
    .min(1, "Il nome è obbligatorio")
    .max(100, "Il nome non può superare i 100 caratteri")
    .regex(/^[a-zA-Z\s]+$/, "Il nome può contenere solo lettere e spazi"),
  role: z.string()
    .min(1, "Il ruolo è obbligatorio")
    .max(100, "Il ruolo non può superare i 100 caratteri"),
  bio: z.string()
    .min(10, "La biografia deve contenere almeno 10 caratteri")
    .max(500, "La biografia non può superare i 500 caratteri"),
  image: z.any()
    .refine((files) => files?.[0]?.size <= 5000000, "L'immagine deve essere inferiore a 5MB")
    .refine(
      (files) => ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type),
      "Formato non supportato. Usa JPEG, PNG o WebP"
    ),
  socialLinks: z.array(socialLinkSchema).min(1).max(4)
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

export default function AdminTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [apiRetries, setApiRetries] = useState(0);
  const { toast } = useToast();
  const { token, isAuthenticated, login, logout } = useAuth();

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      role: "",
      bio: "",
      socialLinks: [
        { platform: "facebook", url: "" },
        { platform: "instagram", url: "" }
      ]
    },
  });

  // Token validation with refresh mechanism
  const validateAndRefreshToken = useCallback(async () => {
    if (!token || !isAuthenticated) {
      logout();
      toast({
        title: "Sessione scaduta",
        description: "Effettua nuovamente il login per continuare",
        variant: "destructive",
      });
      return false;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Token non valido');
      }

      const payload = JSON.parse(atob(parts[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const refreshThreshold = 5 * 60 * 1000; // 5 minutes
      const retryAttempts = 3;
      const retryDelay = 1000; // 1 second

      if (currentTime >= expirationTime - refreshThreshold) {
        // Token is about to expire, try to refresh with retry mechanism
        for (let attempt = 0; attempt < retryAttempts; attempt++) {
          try {
            const response = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.status === 401) {
              logout();
              return false;
            }

            if (!response.ok) {
              throw new Error('Impossibile aggiornare la sessione');
            }

            const { token: newToken } = await response.json();
            login(newToken);
            return true;
          } catch (error) {
            if (attempt === retryAttempts - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      logout();
      return false;
    }
  }, [token, isAuthenticated, login, logout, toast]);

  // Enhanced fetch with retry mechanism
  const fetchWithRetry = useCallback(async (
    url: string,
    options: RequestInit,
    maxRetries = 3,
    baseDelay = 1000
  ) => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (!await validateAndRefreshToken()) {
          throw new Error('Sessione non valida');
        }

        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }, [token, validateAndRefreshToken]);

  // Fetch team members with retry mechanism
  const fetchTeamMembers = useCallback(async () => {
    try {
      const data = await fetchWithRetry("/api/team", { method: 'GET' });
      if (!Array.isArray(data)) {
        throw new Error("Formato dati non valido");
      }
      
      setTeamMembers(data);
      setLastError(null);
      setRetryCount(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Errore nel caricamento";
      setLastError(errorMessage);
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchTeamMembers();
        }, Math.pow(2, retryCount) * 1000);
      }
    }
  }, [fetchWithRetry, retryCount]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTeamMembers();
    }
  }, [isAuthenticated, fetchTeamMembers]);

  // Form submission with error boundary and retry mechanism
  const onSubmit = async (data: TeamFormValues) => {
    try {
      if (!await validateAndRefreshToken()) {
        return;
      }

      setIsLoading(true);
      const formData = new FormData();
      
      if (data.image?.[0]) {
        setImageUploading(true);
        const isImageValid = await validateImage(data.image[0]);
        if (!isImageValid) {
          setImageUploading(false);
          return;
        }
        formData.append("image", data.image[0]);
      }
      
      // Validate required fields
      if (!data.name.trim() || !data.role.trim() || !data.bio.trim()) {
        toast({
          title: "Errore di validazione",
          description: "Tutti i campi sono obbligatori",
          variant: "destructive",
        });
        return;
      }

      // Validate social links
      const validSocialLinks = data.socialLinks.filter(link => {
        try {
          new URL(link.url);
          return true;
        } catch {
          return false;
        }
      });

      formData.append("name", data.name.trim());
      formData.append("role", data.role.trim());
      formData.append("bio", data.bio.trim());
      formData.append("socialLinks", JSON.stringify(validSocialLinks));

      const url = isEditing && currentMember
        ? `/api/team/${currentMember.id}`
        : "/api/team";
      
      const response = await fetchWithRetry(url, {
        method: isEditing ? "PUT" : "POST",
        body: formData
      });

      if (!response) {
        throw new Error("Failed to save team member");
      }

      toast({
        title: "Successo",
        description: `Membro del team ${isEditing ? "aggiornato" : "creato"} con successo`,
      });

      form.reset();
      setIsEditing(false);
      setCurrentMember(null);
      setIsDialogOpen(false);
      await fetchTeamMembers();
    } catch (error) {
      console.error('Form submission error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message
        : "Errore nell'operazione";
        
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setImageUploading(false);
    }
  };

  // Image validation with enhanced error handling
  const validateImage = async (file: File): Promise<boolean> => {
    try {
      if (!file) return false;

      if (file.size > 5000000) {
        toast({
          title: "Errore",
          description: "L'immagine deve essere inferiore a 5MB",
          variant: "destructive",
        });
        return false;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Errore",
          description: "Formato non supportato. Usa JPEG, PNG o WebP",
          variant: "destructive",
        });
        return false;
      }

      return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(true);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          toast({
            title: "Errore",
            description: "Immagine non valida o corrotta",
            variant: "destructive",
          });
          resolve(false);
        };
        
        img.src = objectUrl;
      });
    } catch (error) {
      console.error('Image validation error:', error);
      toast({
        title: "Errore",
        description: "Errore durante la validazione dell'immagine",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle edit team member
  const handleEdit = (member: TeamMember) => {
    if (!validateAndRefreshToken()) return;
    
    setIsEditing(true);
    setCurrentMember(member);
    form.reset({
      name: member.name,
      role: member.role,
      bio: member.bio,
      socialLinks: Array.isArray(member.socialLinks) 
        ? member.socialLinks.map(link => {
            if (typeof link === 'object' && link !== null && 'platform' in link && 'url' in link) {
              return {
                platform: String(link.platform || ''),
                url: String(link.url || '')
              };
            }
            return { platform: '', url: '' };
          })
        : []
    });
    setIsDialogOpen(true);
  };

  // Delete team member with confirmation and error handling
  const handleDelete = async (memberId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo membro del team?')) {
      return;
    }

    try {
      setIsLoading(true);
      await fetchWithRetry(`/api/team/${memberId}`, { method: 'DELETE' });
      
      toast({
        title: "Successo",
        description: "Membro del team eliminato con successo",
      });

      await fetchTeamMembers();
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nell'eliminazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      return;
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Accesso Richiesto</h2>
          <p className="text-lg text-gray-600 mb-4">Effettua il login per gestire il team</p>
          <div className="animate-spin">
            <Loader2 className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestione Team</h1>
          
          {lastError && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <span>{lastError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRetryCount(0);
                  fetchTeamMembers();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Riprova
              </Button>
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  if (!validateAndRefreshToken()) return;
                  setIsEditing(false);
                  setCurrentMember(null);
                  form.reset({
                    name: "",
                    role: "",
                    bio: "",
                    socialLinks: [
                      { platform: "facebook", url: "" },
                      { platform: "instagram", url: "" }
                    ]
                  });
                }}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Membro
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Modifica Membro" : "Nuovo Membro"}
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruolo</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biografia</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Immagine</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => onChange(e.target.files)}
                              disabled={isLoading || imageUploading}
                              {...field}
                            />
                            {imageUploading && (
                              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Social Links Fields */}
                  {form.watch('socialLinks')?.map((_, index) => (
                    <div key={index} className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`socialLinks.${index}.platform`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Piattaforma Social {index + 1}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`socialLinks.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Social {index + 1}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="relative"
                    >
                      {isLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {isEditing ? "Aggiorna" : "Crea"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Biografia</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Caricamento...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nessun membro del team presente
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {member.bio}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(member)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(member.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ErrorBoundary>
  );
}
