import { Button } from "@/components/ui/button";
import { Project } from "@/types/project";
import { X } from "lucide-react";
import { motion } from "framer-motion";

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
}

export function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-[300px] object-cover rounded-t-lg"
          />
        </div>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">{project.title}</h2>
          <p className="text-gray-600 mb-4">{project.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Categoria:</span>{" "}
              <span className="capitalize">{project.category}</span>
            </div>
            <div>
              <span className="font-semibold">Anno:</span> {project.year}
            </div>
            <div>
              <span className="font-semibold">Località:</span> {project.location}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
