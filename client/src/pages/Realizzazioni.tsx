import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProjectGallery } from "@/components/gallery/ProjectGallery";
import { Project } from "@/types/project";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { ProjectDetail } from "@/components/gallery/ProjectDetail";

export function Realizzazioni() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <motion.section
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="relative h-[40vh] min-h-[400px] flex items-center bg-primary/10"
        >
          <div className="container mx-auto px-4">
            <motion.div variants={fadeInUp} className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Le Nostre Realizzazioni</h1>
              <p className="text-xl text-gray-600">
                Scopri i nostri progetti più significativi che raccontano
                il nostro impegno nell'eccellenza costruttiva.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Projects Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">I Nostri Progetti</h2>
            <ProjectGallery onProjectClick={setSelectedProject} />
          </div>
        </section>

        <AnimatePresence>
          {selectedProject && (
            <ProjectDetail
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
