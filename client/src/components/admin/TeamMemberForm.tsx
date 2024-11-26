import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "./ImageUploader";
import { useToast } from "@/hooks/use-toast";
import type { InsertTeamMember } from "@db/schema";

interface TeamMemberFormData extends Omit<InsertTeamMember, 'avatar'> {
  avatarFile?: File;
}

export function TeamMemberForm() {
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<TeamMemberFormData>();

  const onSubmit = async (data: TeamMemberFormData) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('role', data.role);
      if (data.socialFacebook) formData.append('socialFacebook', data.socialFacebook);
      if (data.socialTwitter) formData.append('socialTwitter', data.socialTwitter);
      if (data.socialInstagram) formData.append('socialInstagram', data.socialInstagram);
      if (data.avatarFile) formData.append('avatar', data.avatarFile);

      const response = await fetch('/api/admin/team-members', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Successo",
        description: "Membro del team aggiunto con successo",
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
        <CardTitle>Aggiungi Membro del Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ImageUploader
            onImageSelect={(file) => setValue('avatarFile', file)}
            className="mb-4"
          />
          
          <div className="space-y-2">
            <Input
              {...register("name", { required: "Nome richiesto" })}
              placeholder="Nome"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              {...register("role", { required: "Ruolo richiesto" })}
              placeholder="Ruolo"
              disabled={isSubmitting}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              {...register("socialFacebook")}
              placeholder="Link Facebook"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Input
              {...register("socialTwitter")}
              placeholder="Link Twitter"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Input
              {...register("socialInstagram")}
              placeholder="Link Instagram"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvataggio..." : "Salva"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
