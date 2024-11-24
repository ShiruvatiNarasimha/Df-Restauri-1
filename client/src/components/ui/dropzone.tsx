import * as React from "react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";

interface DropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  isUploading?: boolean;
  progress?: number;
  error?: string | null;
  className?: string;
  maxFiles?: number;
  maxSize?: number;
}

export function Dropzone({
  onDrop,
  isUploading = false,
  progress = 0,
  error = null,
  className,
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  ...props
}: DropzoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    maxFiles,
    maxSize,
    onDropRejected: (rejections) => {
      console.error('Files rejected:', rejections);
    }
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25",
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        {error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <p className="text-sm">{error}</p>
          </div>
        ) : isUploading ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <div className="w-full max-w-xs">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Caricamento in corso... {progress}%
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-muted-foreground">Rilascia i file qui...</p>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Trascina i file qui, o clicca per selezionarli
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Massimo {maxFiles} file, {Math.round(maxSize / (1024 * 1024))}MB ciascuno
                </p>
              </div>
            )}
          </>
        )}
        
        {fileRejections.length > 0 && (
          <div className="mt-4 text-sm text-destructive">
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                <span>{file.name}: {errors.map(e => e.message).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
