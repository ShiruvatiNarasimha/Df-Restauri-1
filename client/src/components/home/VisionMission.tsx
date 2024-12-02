import { useAboutContent } from "@/hooks/useContent";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";

export function VisionMission() {
  const { data: aboutContent, isLoading, error } = useAboutContent();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-12">
        Si è verificato un errore nel caricamento del contenuto.
      </div>
    );
  }

  return (
    <section className="section-padding bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="grid grid-cols-1 md:grid-cols-2 gap-12"
        >
          {/* Mission Section */}
          <motion.div
            variants={fadeInUp}
            className="bg-background p-8 rounded-lg shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-6 text-primary">Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              {aboutContent?.mission.content}
            </p>
          </motion.div>

          {/* Vision Section */}
          <motion.div
            variants={fadeInUp}
            className="bg-background p-8 rounded-lg shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-6 text-primary">Vision</h2>
            <p className="text-muted-foreground leading-relaxed">
              {aboutContent?.vision.content}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
