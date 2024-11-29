import { useState, useEffect } from "react";
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
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Service } from "@db/schema";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  description: z.string().min(1, "La descrizione è obbligatoria"),
  category: z.string().min(1, "La categoria è obbligatoria"),
  image: z.instanceof(FileList).optional(),
  features: z.string().optional(),
  gallery: z.array(z.string()).optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

import { ImageOrderList } from "@/components/admin/ImageOrderList";

export default function AdminServices(): JSX.Element {
  const [services, setServices] = useState<Service[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const { toast } = useToast();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      features: "[]",
    },
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: ServiceFormValues) => {
    const formData = new FormData();
    
    // Handle each field explicitly with proper typing
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("category", data.category);
    
    // Handle features with proper JSON validation
    try {
      const featuresArray = data.features ? JSON.parse(data.features) : [];
      if (!Array.isArray(featuresArray)) {
        throw new Error("Features must be a valid JSON array");
      }
      formData.append("features", JSON.stringify(featuresArray));
    } catch (error) {
      toast({
        title: "Invalid Features Format",
        description: "Please ensure features is a valid JSON array",
        variant: "destructive",
      });
      return;
    }
    
    // Handle image upload with type checking
    if (data.image instanceof FileList && data.image.length > 0) {
      const file = data.image[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload only image files",
          variant: "destructive",
        });
        return;
      }
      formData.append("image", file);
    }

    try {
      const url = isEditing
        ? `/api/services/${currentService?.id}`
        : "/api/services";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save service");

      toast({
        title: "Success",
        description: `Service ${isEditing ? "updated" : "created"} successfully`,
      });

      form.reset();
      setIsEditing(false);
      setCurrentService(null);
      fetchServices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (service: Service) => {
    setCurrentService(service);
    setIsEditing(true);
    form.reset({
      name: service.name,
      description: service.description,
      category: service.category,
      features: JSON.stringify(service.features || []),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestione Servizi</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Servizio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Modifica Servizio" : "Nuovo Servizio"}
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caratteristiche (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder='["Feature 1", "Feature 2"]' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Immagine</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files)}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Immagine</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files)}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {currentService && (
                        <div className="mt-4">
                          <h3 className="text-lg font-medium mb-4">Gallery Images</h3>
                          <ImageOrderList
                            images={[
                              {
                                id: currentService.id.toString(),
                                url: currentService.image,
                                order: 1,
                              },
                              ...(Array.isArray(currentService.gallery) ? (currentService.gallery as string[]) : []).map((url, index) => ({
                                id: `${currentService.id}-${index + 1}`,
                                url,
                                order: index + 2,
                              })),
                            ]}
                            onImageUpload={async (files) => {
                              const formData = new FormData();
                              Array.from(files).forEach((file) => {
                                formData.append('images', file);
                              });
                              
                              try {
                                const response = await fetch(
                                  `/api/services/${currentService.id}/images`,
                                  {
                                    method: 'POST',
                                    body: formData,
                                  }
                                );

                                if (!response.ok) throw new Error('Failed to upload images');

                                const data = await response.json();
                                fetchServices();

                                toast({
                                  title: 'Success',
                                  description: 'Images uploaded successfully',
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to upload images',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            onChange={async (images) => {
                              try {
                                const response = await fetch(
                                  `/api/services/${currentService.id}/image-order`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      imageOrder: images
                                        .filter(img => img.order !== undefined)
                                        .map((img) => ({
                                          id: img.id,
                                          order: img.order || 0,
                                        })),
                                    }),
                                  }
                                );

                                if (!response.ok) throw new Error("Failed to update image order");

                                toast({
                                  title: "Success",
                                  description: "Image order updated successfully",
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to update image order",
                                  variant: "destructive",
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {isEditing ? "Aggiorna" : "Crea"} Servizio
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.category}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(service)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
