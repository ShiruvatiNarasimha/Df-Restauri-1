import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload } from "lucide-react";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  previewUrl?: string;
  className?: string;
}

export function ImageUploader({ onImageSelect, previewUrl, className }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(previewUrl);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onImageSelect(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload" className="cursor-pointer">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <Upload className="text-white" />
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-48 flex flex-col items-center justify-center gap-2"
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-muted-foreground">Carica immagine</span>
          </Button>
        )}
      </label>
    </div>
  );
}
