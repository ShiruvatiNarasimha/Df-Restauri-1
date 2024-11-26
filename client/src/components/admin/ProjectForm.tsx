import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "./ImageUploader";
import { useToast } from "@/hooks/use-toast";
import type { InsertProject } from "@db/schema";

interface ProjectFormData extends Omit<InsertProject, 'image'> {
  imageFile?: File;
}

const CATEGORIES = [
  { value: 'restauro', label: 'Restauro' },
  { value: 'costruzione', label: 'Costruzione' },
  { value: 'ristrutturazione', label: 'Ristrutturazione' },
];

export function ProjectForm() {
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ProjectFormData>();

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('year', data.year.toString());
      formData.append('location', data.location);
      if (data.imageFile) formData.append('image', data.imageFile);

      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Successo",
        description: "Progetto aggiunto con successo",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aggiungi Progetto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ImageUploader
            onImageSelect={(file) => setValue('imageFile', file)}
            className="mb-4"
          />
          
          <div className="space-y-2">
            <Input
              {...register("title", { required: "Titolo richiesto" })}
              placeholder="Titolo"
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              {...register("description", { required: "Descrizione richiesta" })}
              placeholder="Descrizione"
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Select
              onValueChange={(value) => setValue('category', value)}
              defaultValue={CATEGORIES[0].value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Input
              {...register("year", {
                required: "Anno richiesto",
                valueAsNumber: true,
                min: { value: 1900, message: "Anno non valido" },
                max: { value: new Date().getFullYear(), message: "Anno non valido" },
              })}
              type="number"
              placeholder="Anno"
              disabled={isSubmitting}
            />
            {errors.year && (
              <p className="text-sm text-destructive">{errors.year.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              {...register("location", { required: "Località richiesta" })}
              placeholder="Località"
              disabled={isSubmitting}
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvataggio..." : "Salva"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
