import { CheckCircle, Loader2 } from "lucide-react";
import { HistoryGallery } from "@/components/gallery/HistoryGallery";
import { STOCK_PHOTOS } from "@/lib/constants";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, fadeIn, slideIn } from "@/lib/animations";
import { useAboutContent } from "@/hooks/useContent";

// Values are now loaded dynamically

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function CiPresentiamo() {
  const { data: aboutContent, isLoading, error } = useAboutContent();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <motion.section 
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="py-20"
        >
          <div className="container mx-auto px-4">
            <motion.div 
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h1 className="text-4xl font-bold mb-4">Ci Presentiamo</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Scopri la nostra storia, i nostri valori e la passione che mettiamo in ogni progetto.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div variants={slideIn}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="text-red-500 text-center py-12">
                    Si è verificato un errore nel caricamento del contenuto.
                  </div>
                ) : aboutContent ? (
                  <>
                    <h2 className="text-3xl font-bold mb-6">{aboutContent.storia.title}</h2>
                    <p className="text-gray-600 mb-8">{aboutContent.storia.content}</p>
                    <HistoryGallery />
                    <motion.div 
                      variants={staggerChildren}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12"
                    >
                      {aboutContent.valori.items?.map((value) => (
                        <motion.div
                          key={value}
                          variants={fadeInUp}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="text-primary" />
                          <span>{value}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </>
                ) : null}
              </motion.div>

              <motion.div
                variants={fadeIn}
                className="relative"
              >
                <img
                  src={STOCK_PHOTOS.restoration[0]}
                  alt="Il nostro lavoro di restauro"
                  className="rounded-lg shadow-xl"
                />
                <motion.div
                  variants={slideIn}
                  className="absolute -bottom-6 -left-6 bg-primary text-white p-6 rounded-lg"
                >
                  <div className="text-4xl font-bold mb-2">20+</div>
                  <div className="text-sm">Anni di esperienza</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Valori Aziendali Section */}
        <motion.section
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="py-20 bg-gray-50"
        >
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-12">
                Si è verificato un errore nel caricamento dei valori aziendali.
              </div>
            ) : aboutContent ? (
              <motion.div
                variants={fadeInUp}
                className="text-center"
              >
                <h2 className="text-3xl font-bold mb-4">
                  {aboutContent.valori.title}
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto mb-12">
                  {aboutContent.valori.content}
                </p>
                <motion.div
                  variants={staggerChildren}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
                >
                  {aboutContent.valori.items?.map((value) => (
                    <motion.div
                      key={value}
                      variants={fadeInUp}
                      className="bg-white p-6 rounded-lg shadow-sm"
                    >
                      <CheckCircle className="text-primary mx-auto mb-4 h-8 w-8" />
                      <p className="text-gray-800">{value}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ) : null}
          </div>
        </motion.section>

        {/* Mission e Vision Section */}
        <motion.section
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="py-20"
        >
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-12">
                Si è verificato un errore nel caricamento della mission e vision.
              </div>
            ) : aboutContent ? (
              <motion.div
                variants={fadeInUp}
                className="text-center"
              >
                <h2 className="text-3xl font-bold mb-4">
                  {aboutContent.mission.title}
                </h2>
                <motion.p
                  variants={fadeIn}
                  className="text-gray-600 max-w-3xl mx-auto leading-relaxed"
                >
                  {aboutContent.mission.content}
                </motion.p>
              </motion.div>
            ) : null}
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
