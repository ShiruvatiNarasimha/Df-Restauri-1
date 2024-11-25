import { useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Project } from "@/types/project";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STOCK_PHOTOS } from "@/lib/constants";

// Sample data - in a real app, this would come from an API
const PROJECTS: Project[] = [
  {
    id: "1",
    title: "Restauro Palazzo Storico Veneziano",
    description: "Intervento di restauro conservativo su palazzo del XVI secolo",
    category: "restauro",
    image: STOCK_PHOTOS.restoration[0],
    year: 2023,
    location: "Venezia"
  },
  {
    id: 2,
    title: "Complesso Residenziale Moderno",
    description: "Costruzione di complesso residenziale eco-sostenibile",
    category: "costruzione",
    image: STOCK_PHOTOS.construction[0],
    year: 2023,
    location: "Milano"
  },
  {
    id: 3,
    title: "Ristrutturazione Villa Liberty",
    description: "Ristrutturazione completa con adeguamento energetico",
    category: "ristrutturazione",
    image: STOCK_PHOTOS.renovation[0],
    year: 2022,
    location: "Roma"
  },
  // Add more projects as needed
];

interface ProjectGalleryProps {
  onProjectClick: (project: Project) => void;
}

export function ProjectGallery({ onProjectClick }: ProjectGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<Project['category'] | 'all'>('all');

  const filteredProjects = selectedCategory === 'all'
    ? PROJECTS
    : PROJECTS.filter(project => project.category === selectedCategory);

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
