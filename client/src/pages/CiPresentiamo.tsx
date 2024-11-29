import { CheckCircle, Loader2 } from "lucide-react";
import { HistoryGallery } from "@/components/gallery/HistoryGallery";
import { STOCK_PHOTOS } from "@/lib/constants";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, fadeIn, slideIn } from "@/lib/animations";
import { useAboutContent } from "@/hooks/useContent";
import { Team } from "@/components/home/Team";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function CiPresentiamo() {
  const { data: aboutContent, isLoading, error } = useAboutContent();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <motion.section 
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="section-padding"
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
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="text-red-500 text-lg font-semibold text-center">
                      Si è verificato un errore nel caricamento del contenuto.
                    </div>
                    <div className="text-gray-600 text-sm text-center max-w-md">
                      {error instanceof Error ? error.message : 'Errore sconosciuto. Riprova più tardi.'}
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Riprova
                    </button>
                  </div>
                ) : aboutContent ? (
                  <>
                    {aboutContent.storia && (
                      <>
                        <h2 className="text-3xl font-bold mb-6">{aboutContent.storia.title}</h2>
                        <p className="text-gray-600 mb-8">{aboutContent.storia.content}</p>
                        
                        {/* History Timeline */}
                        <div className="mb-12">
                          <h3 className="text-2xl font-semibold mb-6">Il Nostro Percorso</h3>
                          <div className="space-y-6">
                            {aboutContent.storia.milestones?.map((milestone, index) => (
                              <div key={index} className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-24">
                                  <span className="font-bold text-primary">{milestone.year}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-700">{milestone.achievement}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <HistoryGallery />
                      </>
                    )}
                  </>
                ) : null}
              </motion.div>

              <motion.div
                variants={fadeIn}
                className="relative"
              >
                {isLoading ? (
                  <div className="rounded-lg shadow-xl w-full h-[600px] bg-gray-100 animate-pulse flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={STOCK_PHOTOS.about}
                      alt="La nostra storia - DF Restauri"
                      className="rounded-lg shadow-xl w-full h-full object-cover"
                      loading="eager"
                      decoding="async"
                      width={800}
                      height={600}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/images/fallback/about-fallback.jpg';
                        console.error('Image failed to load:', STOCK_PHOTOS.about);
                      }}
                    />
                    <div 
                      className="absolute inset-0 bg-gray-100 animate-pulse"
                      style={{ display: 'none' }}
                      id="image-loading-placeholder"
                    />
                  </div>
                )}
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

        {/* Team Section */}
        <motion.section
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="bg-white"
        >
          <Team />
        </motion.section>

        {/* Valori Aziendali Section */}
        <motion.section
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="section-padding bg-gray-50"
        >
          <div className="container section-spacing">
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
                  {aboutContent.valori.items?.map((value: string, index: number) => (
                    <motion.div
                      key={index}
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
          className="section-padding bg-white"
        >
          <div className="container section-spacing">
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
                        {aboutContent.mission.points.map((point: string, index: number) => (
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
                        {aboutContent.vision.points.map((point: string, index: number) => (
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
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
