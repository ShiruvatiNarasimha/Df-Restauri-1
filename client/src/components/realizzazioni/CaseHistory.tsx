import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { CaseHistory as CaseHistoryType } from "@/types/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceGallery } from "@/components/gallery/ServiceGallery";
import { STOCK_PHOTOS } from "@/lib/constants";

// Sample data - in a real app, this would come from an API
const CASE_HISTORIES: CaseHistoryType[] = [
  {
    id: "2",
    title: "Restauro Complesso Residenziale",
    description: "Intervento di restauro e riqualificazione di un complesso residenziale moderno",
    category: "restauro",
    image: STOCK_PHOTOS.restoration[0],
    year: 2024,
    location: "Udine",
    challenge: "Il complesso residenziale necessitava di un intervento di restauro completo delle facciate e delle aree comuni, con particolare attenzione all'efficienza energetica.",
    solution: "Abbiamo realizzato un intervento di restauro conservativo utilizzando materiali e tecniche innovative, preservando l'estetica originale dell'edificio e migliorando le prestazioni energetiche.",
    results: [
      "Riqualificazione completa delle facciate",
      "Miglioramento dell'isolamento termico",
      "Ripristino delle aree comuni",
      "Ottimizzazione energetica dell'intero complesso"
    ],
    gallery: [
      STOCK_PHOTOS.restoration[0], // Prima
      STOCK_PHOTOS.restoration[1]  // Dopo
    ]
  }
];

export function CaseHistory() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerChildren}
      className="space-y-12"
    >
      {CASE_HISTORIES.map((caseHistory) => (
        <motion.div
          key={caseHistory.id}
          variants={fadeInUp}
          className="bg-background rounded-lg shadow-sm"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{caseHistory.title}</CardTitle>
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{caseHistory.location}</span>
                <span>{caseHistory.year}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{caseHistory.description}</p>
              
              <div>
                <h3 className="font-semibold mb-2">La Sfida</h3>
                <p className="text-muted-foreground">{caseHistory.challenge}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">La Soluzione</h3>
                <p className="text-muted-foreground">{caseHistory.solution}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Risultati</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {caseHistory.results.map((result, index) => (
                    <li key={index}>{result}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-4">Galleria del Progetto</h3>
                <ServiceGallery 
                  images={caseHistory.gallery}
                  category={caseHistory.category}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
