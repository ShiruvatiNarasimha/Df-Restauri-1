import * as React from "react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";

interface DropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  className?: string;
  children?: React.ReactNode;
}

export function Dropzone({
  onDrop,
  accept,
  maxFiles = 10,
  className,
  children,
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
    accept,
    multiple: true,
    maxFiles,
    maxSize: 5 * 1024 * 1024, // 5MB
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
        {children || (
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
                  Massimo {maxFiles} file, 5MB ciascuno
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
