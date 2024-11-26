import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Project } from "@/types/project";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProjectGalleryProps {
  onProjectClick: (project: Project) => void;
}

export function ProjectGallery({ onProjectClick }: ProjectGalleryProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Project['category'] | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = selectedCategory === 'all'
    ? projects
    : projects.filter(project => project.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        {error}
      </div>
    );
  }

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
        {filteredProjects.map((project) => (
          <motion.div
            key={project.id}
            variants={fadeInUp}
            onClick={() => onProjectClick(project)}
          >
            <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
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
    </motion.div>
  );
}
