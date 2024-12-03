import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TeamMember } from "@db/schema";

// Form validation schema
const teamMemberSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  role: z.string().min(1, "Il ruolo è obbligatorio"),
  bio: z.string().nullable(),
  email: z.string().email("Email non valida").nullable(),
  phone: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

type FormData = z.infer<typeof teamMemberSchema>;

interface TeamMemberFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<TeamMember>;
  onClose: () => void;
}

export function TeamMemberForm({ onSubmit, initialData, onClose }: TeamMemberFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      role: initialData?.role ?? "",
      bio: initialData?.bio ?? null,
      email: initialData?.email ?? null,
      phone: initialData?.phone ?? null,
      imageUrl: initialData?.imageUrl ?? null,
    },
  });

  const onSubmitHandler = async (data: FormData) => {
    try {
      await onSubmit(data);
      toast({
        title: "Successo",
        description: `Membro del team ${initialData ? "aggiornato" : "creato"} con successo`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome*</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Inserisci il nome"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Ruolo*</Label>
        <Input
          id="role"
          {...register("role")}
          placeholder="Inserisci il ruolo"
        />
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biografia</Label>
        <Textarea
          id="bio"
          {...register("bio")}
          placeholder="Inserisci la biografia"
        />
        {errors.bio && (
          <p className="text-sm text-destructive">{errors.bio.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="Inserisci l'email"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefono</Label>
        <Input
          id="phone"
          {...register("phone")}
          placeholder="Inserisci il numero di telefono"
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">URL Immagine</Label>
        <Input
          id="imageUrl"
          {...register("imageUrl")}
          placeholder="Inserisci l'URL dell'immagine"
        />
        {errors.imageUrl && (
          <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvataggio..." : initialData ? "Aggiorna" : "Crea"}
        </Button>
      </div>
    </form>
  );
}
