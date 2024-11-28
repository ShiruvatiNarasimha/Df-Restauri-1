import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import type { Project } from "@/types/project";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

interface ProjectGalleryProps {
  onProjectClick?: (project: Project) => void;
}

export function ProjectGallery({ onProjectClick }: ProjectGalleryProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Project['category'] | 'all'>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  // Enhanced fetch with timeout and retry mechanism
  const fetchProjectsWithRetry = useCallback(async () => {
    try {
      setIsRetrying(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/projects", {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'same-origin'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Formato dati non valido");
      }

      // Sort projects by year in descending order
      const sortedProjects = [...data].sort((a, b) => b.year - a.year);
      setProjects(sortedProjects);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error("Errore caricamento progetti:", err);
      const errorMessage = err instanceof Error ? err.message : "Errore caricamento progetti";
      setError(errorMessage);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });

      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchProjectsWithRetry();
        }, delay);
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [retryCount, toast]);

  useEffect(() => {
    fetchProjectsWithRetry();
  }, [fetchProjectsWithRetry]);

  // Image error handling with retry mechanism
  const handleImageError = useCallback((projectId: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const retryCount = parseInt(target.dataset.retryCount || '0');
    
    if (retryCount < 2) {
      // Retry loading with cache-busting
      target.dataset.retryCount = (retryCount + 1).toString();
      const timestamp = new Date().getTime();
      target.src = `${target.src.split('?')[0]}?t=${timestamp}`;
    } else {
      // After retries, use fallback
      target.onerror = null;
      target.src = '/images/fallback/project-fallback.jpg';
      setImageErrors(prev => ({
        ...prev,
        [projectId]: true
      }));
      console.error(`Failed to load image for project ${projectId}`);
    }
  }, []);

  const filteredProjects = selectedCategory === 'all'
    ? projects
    : projects.filter(project => project.category === selectedCategory);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerChildren}
      className="space-y-8"
    >
      {/* Category Filter */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
        >
          Tutti i Progetti
        </Button>
        <Button
          variant={selectedCategory === 'restauro' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('restauro')}
        >
          Restauro
        </Button>
        <Button
          variant={selectedCategory === 'costruzione' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('costruzione')}
        >
          Costruzione
        </Button>
        <Button
          variant={selectedCategory === 'ristrutturazione' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('ristrutturazione')}
        >
          Ristrutturazione
        </Button>
      </div>

      {/* Error State with Retry */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-700 mb-4">{error}</p>
          <Button
            onClick={() => {
              setRetryCount(0);
              fetchProjectsWithRetry();
            }}
            disabled={isRetrying}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            Riprova
          </Button>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProjects.map((project) => (
          <motion.div
            key={project.id}
            variants={fadeInUp}
            onClick={() => onProjectClick?.(project)}
          >
            <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <ImageWithFallback
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  category="project"
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">{project.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{project.location}</span>
                  <span>{project.year}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {!isLoading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nessun progetto trovato per questa categoria.
        </div>
      )}
    </motion.div>
  );
}
