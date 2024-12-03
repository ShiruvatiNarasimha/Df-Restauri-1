import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@db/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form validation schema
const projectSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().min(1, "La descrizione è obbligatoria"),
  category: z.enum(["restauro", "costruzione", "ristrutturazione"], {
    required_error: "La categoria è obbligatoria",
  }),
  location: z.string().nullable(),
  completionDate: z.string().nullable(),
  coverImage: z.string().nullable(),
  gallery: z.array(z.string()).default([]),
  client: z.string().nullable(),
  duration: z.string().nullable(),
  techniques: z.array(z.string()).default([]),
  details: z.string().nullable(),
  year: z.number().int().positive().nullable(),
});

type FormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<Project>;
  onClose: () => void;
}

export function ProjectForm({ onSubmit, initialData, onClose }: ProjectFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      category: (initialData?.category as "restauro" | "costruzione" | "ristrutturazione") ?? "restauro",
      location: initialData?.location ?? null,
      completionDate: initialData?.completionDate 
        ? new Date(initialData.completionDate).toISOString().split('T')[0]
        : null,
      coverImage: initialData?.coverImage ?? null,
      gallery: initialData?.gallery ?? [],
      client: initialData?.client ?? null,
      duration: initialData?.duration ?? null,
      techniques: initialData?.techniques ?? [],
      details: initialData?.details ?? null,
      year: initialData?.year ?? null,
    },
  });

  const onSubmitHandler = async (data: FormData) => {
    try {
      await onSubmit(data);
      toast({
        title: "Successo",
        description: `Progetto ${initialData ? "aggiornato" : "creato"} con successo`,
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
        <Label htmlFor="title">Titolo*</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="Inserisci il titolo del progetto"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrizione*</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Inserisci la descrizione del progetto"
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoria*</Label>
        <Select 
          onValueChange={(value) => setValue("category", value as "restauro" | "costruzione" | "ristrutturazione")}
          defaultValue={initialData?.category ?? "restauro"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona una categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="restauro">Restauro</SelectItem>
            <SelectItem value="costruzione">Costruzione</SelectItem>
            <SelectItem value="ristrutturazione">Ristrutturazione</SelectItem>
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Località</Label>
        <Input
          id="location"
          {...register("location")}
          placeholder="Inserisci la località"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="completionDate">Data di Completamento</Label>
        <Input
          id="completionDate"
          type="date"
          {...register("completionDate")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">Immagine di Copertina</Label>
        <Input
          id="coverImage"
          {...register("coverImage")}
          placeholder="Inserisci l'URL dell'immagine di copertina"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client">Cliente</Label>
        <Input
          id="client"
          {...register("client")}
          placeholder="Inserisci il nome del cliente"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Durata</Label>
        <Input
          id="duration"
          {...register("duration")}
          placeholder="Inserisci la durata del progetto"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Dettagli</Label>
        <Textarea
          id="details"
          {...register("details")}
          placeholder="Inserisci i dettagli del progetto"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year">Anno</Label>
        <Input
          id="year"
          type="number"
          {...register("year", { valueAsNumber: true })}
          placeholder="Inserisci l'anno del progetto"
        />
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
