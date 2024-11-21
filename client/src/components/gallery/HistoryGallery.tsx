import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { STOCK_PHOTOS } from "@/lib/constants";

export function HistoryGallery() {
  const images = STOCK_PHOTOS.restoration;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerChildren}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
    >
      {images.map((image, index) => (
        <motion.div
          key={index}
          variants={fadeInUp}
          className="relative group overflow-hidden rounded-lg"
        >
          <img
            src={image}
            alt={`Storia aziendale ${index + 1}`}
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">
              {index === 0 ? "I Nostri Inizi" : index === 1 ? "La Crescita" : "Il Presente"}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
