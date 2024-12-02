import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { STOCK_PHOTOS } from "@/lib/constants";

export function HistoryGallery() {
  const images = [
    STOCK_PHOTOS.restoration[0],
    STOCK_PHOTOS.construction[0],
    STOCK_PHOTOS.renovation[0]
  ];

  const milestones = [
    {
      title: "Esperienza",
      description: "Competenza nel settore delle costruzioni e restauri"
    },
    {
      title: "Innovazione",
      description: "Tecnologie e metodi all'avanguardia"
    },
    {
      title: "Sostenibilità",
      description: "Impegno per l'ambiente e il futuro"
    }
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerChildren}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
    >
      {images.map((image, index) => (
        <motion.div
          key={index}
          variants={fadeInUp}
          className="relative group overflow-hidden rounded-lg"
        >
          <img
            src={image}
            alt={milestones[index].title}
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
            <span className="text-white text-lg font-semibold mb-2">
              {milestones[index].title}
            </span>
            <span className="text-white text-sm">
              {milestones[index].description}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
