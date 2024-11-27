import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Project } from "@/types/project";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [isFetchingRetry, setIsFetchingRetry] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch("/api/projects", {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch projects");
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received from server");
        }

        setProjects(data);
        setError(null);
        setRetryCount(0);
      } catch (err) {
        console.error("Project fetch error:", err);
        setError(err instanceof Error ? err.message : "Error loading projects");
        
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchProjects();
          }, delay);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [retryCount]);

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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="col-span-3 text-center py-12 text-red-500">
            {error}
          </div>
        ) : filteredProjects.map((project) => (
          <motion.div
            key={project.id}
            variants={fadeInUp}
            onClick={() => onProjectClick?.(project)}
          >
            <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                    imageErrors[project.id] ? 'opacity-50' : ''
                  }`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/fallback/project-fallback.jpg';
                    setImageErrors(prev => ({
                      ...prev,
                      [project.id]: true
                    }));
                    console.error(`Failed to load image for project ${project.id}`);
                  }}
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
