import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ServiceImage } from "@/types/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const serviceImageSchema = z.object({
  serviceType: z.enum(["restauro", "costruzione", "ristrutturazione"], {
    required_error: "Il tipo di servizio è obbligatorio",
  }),
  imageUrl: z.string().min(1, "L'URL dell'immagine è obbligatorio"),
  caption: z.string().nullable(),
  displayOrder: z.number().int().default(0),
});

type FormData = z.infer<typeof serviceImageSchema>;

interface ServiceImageFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<ServiceImage>;
  onClose: () => void;
}

export function ServiceImageForm({ onSubmit, initialData, onClose }: ServiceImageFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(serviceImageSchema),
    defaultValues: {
      serviceType: (initialData?.serviceType as "restauro" | "costruzione" | "ristrutturazione") ?? "restauro",
      imageUrl: initialData?.imageUrl ?? "",
      caption: initialData?.caption ?? null,
      displayOrder: initialData?.displayOrder ?? 0,
    },
  });

  const onSubmitHandler = async (data: FormData) => {
    try {
      await onSubmit(data);
      toast({
        title: "Successo",
        description: `Immagine ${initialData ? "aggiornata" : "creata"} con successo`,
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
        <Label htmlFor="serviceType">Tipo di Servizio*</Label>
        <Select
          onValueChange={(value) => setValue("serviceType", value as "restauro" | "costruzione" | "ristrutturazione")}
          defaultValue={initialData?.serviceType ?? "restauro"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona il tipo di servizio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="restauro">Restauro</SelectItem>
            <SelectItem value="costruzione">Costruzione</SelectItem>
            <SelectItem value="ristrutturazione">Ristrutturazione</SelectItem>
          </SelectContent>
        </Select>
        {errors.serviceType && (
          <p className="text-sm text-destructive">{errors.serviceType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">URL Immagine*</Label>
        <Input
          id="imageUrl"
          {...register("imageUrl")}
          placeholder="Inserisci l'URL dell'immagine"
        />
        {errors.imageUrl && (
          <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption">Didascalia</Label>
        <Input
          id="caption"
          {...register("caption")}
          placeholder="Inserisci la didascalia dell'immagine"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Ordine di Visualizzazione</Label>
        <Input
          id="displayOrder"
          type="number"
          {...register("displayOrder", { valueAsNumber: true })}
          placeholder="Inserisci l'ordine di visualizzazione"
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
