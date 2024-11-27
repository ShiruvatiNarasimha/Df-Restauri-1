import { CheckCircle } from "lucide-react";
import { SectionSeparator } from "@/components/ui/section-separator";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, fadeIn } from "@/lib/animations";

export function MissionVision() {
  return (
    <section className="section-padding bg-gray-50">
      <div className="container section-spacing">
        <SectionSeparator className="mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Mission Section */}
          <motion.div
            variants={fadeInUp}
            className="bg-primary/5 p-8 rounded-lg"
          >
            <h2 className="text-3xl font-bold mb-6 text-primary">Mission</h2>
            <motion.p
              variants={fadeIn}
              className="text-gray-700 leading-relaxed mb-6"
            >
              Ci impegniamo a preservare e valorizzare il patrimonio edilizio attraverso tecniche innovative e sostenibili, garantendo la massima qualità in ogni progetto.
            </motion.p>
            <ul className="space-y-3">
              <motion.li variants={fadeInUp} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <span className="text-gray-600">Eccellenza nei restauri e nelle costruzioni</span>
              </motion.li>
              <motion.li variants={fadeInUp} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <span className="text-gray-600">Sostenibilità ambientale</span>
              </motion.li>
              <motion.li variants={fadeInUp} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <span className="text-gray-600">Innovazione tecnologica</span>
              </motion.li>
            </ul>
          </motion.div>

          {/* Vision Section */}
          <motion.div
            variants={fadeInUp}
            className="bg-primary/5 p-8 rounded-lg"
          >
            <h2 className="text-3xl font-bold mb-6 text-primary">Vision</h2>
            <motion.p
              variants={fadeIn}
              className="text-gray-700 leading-relaxed mb-6"
            >
              Aspiriamo a diventare leader nel settore delle costruzioni e dei restauri, creando spazi che uniscono tradizione e innovazione per le generazioni future.
            </motion.p>
            <ul className="space-y-3">
              <motion.li variants={fadeInUp} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <span className="text-gray-600">Leadership nel settore</span>
              </motion.li>
              <motion.li variants={fadeInUp} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <span className="text-gray-600">Crescita sostenibile</span>
              </motion.li>
              <motion.li variants={fadeInUp} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <span className="text-gray-600">Eccellenza nel servizio</span>
              </motion.li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
