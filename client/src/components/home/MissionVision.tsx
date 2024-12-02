import { CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, fadeIn } from "@/lib/animations";
import { useAboutContent } from "@/hooks/useContent";
import { SectionSeparator } from "@/components/ui/section-separator";

export function MissionVision() {
  const { data: aboutContent, isLoading, error } = useAboutContent();

  return (
    <section className="section-padding bg-gray-50">
      <div className="container section-spacing">
        <SectionSeparator className="mb-12" />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">
            Si è verificato un errore nel caricamento della mission e vision.
          </div>
        ) : aboutContent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Mission Section */}
            {aboutContent.mission && (
              <motion.div
                variants={fadeInUp}
                className="bg-primary/5 p-8 rounded-lg"
              >
                <h2 className="text-3xl font-bold mb-6 text-primary">Mission</h2>
                <motion.p
                  variants={fadeIn}
                  className="text-gray-700 leading-relaxed mb-6"
                >
                  {aboutContent.mission.content}
                </motion.p>
                {aboutContent.mission.points && aboutContent.mission.points.length > 0 && (
                  <ul className="space-y-3">
                    {aboutContent.mission.points.map((point, index) => (
                      <motion.li
                        key={`mission-${index}`}
                        variants={fadeInUp}
                        className="flex items-start space-x-2"
                      >
                        <CheckCircle className="h-5 w-5 text-primary mt-1" />
                        <span className="text-gray-600">{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}

            {/* Vision Section */}
            {aboutContent.vision && (
              <motion.div
                variants={fadeInUp}
                className="bg-primary/5 p-8 rounded-lg"
              >
                <h2 className="text-3xl font-bold mb-6 text-primary">Vision</h2>
                <motion.p
                  variants={fadeIn}
                  className="text-gray-700 leading-relaxed mb-6"
                >
                  {aboutContent.vision.content}
                </motion.p>
                {aboutContent.vision.points && aboutContent.vision.points.length > 0 && (
                  <ul className="space-y-3">
                    {aboutContent.vision.points.map((point, index) => (
                      <motion.li
                        key={`vision-${index}`}
                        variants={fadeInUp}
                        className="flex items-start space-x-2"
                      >
                        <CheckCircle className="h-5 w-5 text-primary mt-1" />
                        <span className="text-gray-600">{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
