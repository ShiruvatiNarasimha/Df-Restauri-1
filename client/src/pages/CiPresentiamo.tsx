import { CheckCircle, Loader2 } from "lucide-react";
import { HistoryGallery } from "@/components/gallery/HistoryGallery";
import { STOCK_PHOTOS } from "@/lib/constants";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, fadeIn, slideIn } from "@/lib/animations";
import { useAboutContent } from "@/hooks/useContent";
import { Team } from "@/components/home/Team";

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

            <div className="space-y-16">
            {/* History Content */}
            <motion.div variants={slideIn} className="text-center max-w-3xl mx-auto">
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
                </>
              ) : null}
            </motion.div>

            {/* Numbers Showcase */}
            <motion.div variants={staggerChildren} className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { number: "20+", label: "Anni di esperienza" },
                { number: "500+", label: "Progetti completati" },
                { number: "50+", label: "Clienti soddisfatti" },
                { number: "100%", label: "Progetti certificati" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-primary/5 p-8 rounded-lg text-center hover:bg-primary/10 transition-colors"
                >
                  <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* History Gallery */}
            <motion.div variants={fadeIn}>
              <HistoryGallery />
            </motion.div>

            {/* Testimonials */}
            <motion.div variants={staggerChildren} className="bg-gray-50 py-16 rounded-2xl">
              <div className="container">
                <h3 className="text-2xl font-bold text-center mb-12">Cosa Dicono i Nostri Clienti</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      quote: "Professionalità e attenzione ai dettagli incomparabili. Hanno restaurato il nostro edificio storico mantenendone l'autenticità.",
                      author: "Marco Rossi",
                      role: "Proprietario Villa Storica"
                    },
                    {
                      quote: "Un team altamente qualificato che ha saputo interpretare al meglio le nostre esigenze di restauro conservativo.",
                      author: "Laura Bianchi",
                      role: "Amministratore Condominio"
                    },
                    {
                      quote: "Competenza tecnica e rispetto dei tempi. Il risultato ha superato le nostre aspettative.",
                      author: "Giuseppe Verdi",
                      role: "Direttore Museo"
                    }
                  ].map((testimonial, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      className="bg-white p-6 rounded-lg shadow-sm"
                    >
                      <p className="text-gray-600 italic mb-4">"{testimonial.quote}"</p>
                      <div className="text-sm">
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-gray-500">{testimonial.role}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
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
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
