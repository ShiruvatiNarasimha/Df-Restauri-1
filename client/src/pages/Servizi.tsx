import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Building2, PaintBucket, Hammer, CheckCircle2, ArrowRight } from "lucide-react";
import { ServiceGallery } from "@/components/gallery/ServiceGallery";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, fadeIn } from "@/lib/animations";
import { STOCK_PHOTOS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const DETAILED_SERVICES = [
  {
    id: "restauro",
    title: "Restauro",
    description: "Tecniche tradizionali e materiali di alta qualità per preservare il patrimonio storico.",
    longDescription: "Specializzati nel restauro di edifici storici e monumenti, utilizziamo tecniche tradizionali combinate con tecnologie moderne per preservare l'integrità architettonica e il valore culturale delle strutture.",
    icon: PaintBucket,
    features: [
      "Restauro conservativo di edifici storici",
      "Recupero di elementi architettonici",
      "Conservazione di affreschi e decorazioni",
      "Consolidamento strutturale",
      "Diagnostica e analisi preliminare"
    ],
    image: STOCK_PHOTOS.restoration[0]
  },
  {
    id: "costruzione",
    title: "Costruzione",
    description: "Progetti innovativi e sostenibili per costruire il futuro.",
    longDescription: "Realizziamo progetti di costruzione innovativi con un focus sulla sostenibilità ambientale e l'efficienza energetica, garantendo la massima qualità e rispetto delle normative.",
    icon: Building2,
    features: [
      "Edifici residenziali e commerciali",
      "Strutture industriali",
      "Progetti chiavi in mano",
      "Costruzioni eco-sostenibili",
      "Gestione completa del cantiere"
    ],
    image: STOCK_PHOTOS.construction[0]
  },
  {
    id: "ristrutturazione",
    title: "Ristrutturazione",
    description: "Trasformiamo i tuoi spazi con soluzioni moderne ed efficienti.",
    longDescription: "Offriamo servizi completi di ristrutturazione per modernizzare e ottimizzare gli spazi esistenti, migliorando comfort ed efficienza energetica.",
    icon: Hammer,
    features: [
      "Ristrutturazione completa di interni",
      "Adeguamento normativo",
      "Riqualificazione energetica",
      "Ristrutturazione bagni e cucine",
      "Rifacimento impianti"
    ],
    image: STOCK_PHOTOS.renovation[0]
  }
];

export function Servizi() {
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
              <h1 className="text-4xl md:text-5xl font-bold mb-4">I Nostri Servizi</h1>
              <p className="text-xl text-gray-600">
                Esperienza, professionalità e innovazione al servizio dei vostri progetti.
                Scopri come possiamo trasformare le tue idee in realtà.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Detailed Services Section */}
        <motion.section 
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="py-20"
        >
          <div className="container mx-auto px-4">
            {DETAILED_SERVICES.map((service, index) => (
              <motion.div
                key={service.id}
                variants={fadeIn}
                className={`flex flex-col md:flex-row gap-12 items-center ${
                  index !== DETAILED_SERVICES.length - 1 ? 'mb-20 pb-20 border-b' : ''
                }`}
              >
                <div className="w-full md:w-1/2">
                  <service.icon className="w-12 h-12 text-primary mb-6" />
                  <h2 className="text-3xl font-bold mb-4">{service.title}</h2>
                  <p className="text-gray-600 mb-6">{service.longDescription}</p>
                  <ul className="space-y-3">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-8 group">
                    Richiedi Preventivo
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                <div className="w-full md:w-1/2">
                  <ServiceGallery
                    images={
                      service.id === "restauro"
                        ? STOCK_PHOTOS.restoration
                        : service.id === "costruzione"
                        ? STOCK_PHOTOS.construction
                        : STOCK_PHOTOS.renovation
                    }
                    category={service.title}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <section className="bg-primary/10 py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Pronti a Iniziare il Tuo Progetto?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Contattaci per una consulenza gratuita. Il nostro team di esperti è pronto
              ad ascoltare le tue esigenze e proporre le migliori soluzioni per il tuo progetto.
            </p>
            <Button size="lg" className="text-lg px-8">
              Contattaci Ora
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
