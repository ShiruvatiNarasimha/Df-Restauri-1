import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"

interface Certification {
  id: string;
  title: string;
  description: string;
  documentUrl: string;
  year: string;
  category: string;
}

const CERTIFICATIONS: Certification[] = [
  {
    id: "iso-9001",
    title: "ISO 9001:2015",
    description: "Certificazione del Sistema di Gestione per la Qualità",
    documentUrl: "/docs/ISO-9001-2015.pdf",
    year: "2023",
    category: "Qualità"
  },
  {
    id: "iso-14001",
    title: "ISO 14001:2015",
    description: "Sistema di Gestione Ambientale",
    documentUrl: "/docs/ISO-14001-2015.pdf",
    year: "2023",
    category: "Ambiente"
  },
  {
    id: "iso-45001",
    title: "ISO 45001:2018",
    description: "Sistema di Gestione per la Salute e Sicurezza sul Lavoro",
    documentUrl: "/docs/ISO-45001-2018.pdf",
    year: "2023",
    category: "Sicurezza"
  }
];

export default function Certificazioni() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Le Nostre Certificazioni</h1>
      
      <div className="mb-8">
        <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto">
          Il nostro impegno per l'eccellenza è dimostrato attraverso le nostre certificazioni,
          che attestano la nostra dedizione alla qualità, alla sostenibilità e alla sicurezza.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CERTIFICATIONS.map((cert) => (
          <Card key={cert.id} className="p-6">
            <h3 className="text-xl font-semibold mb-2">{cert.title}</h3>
            <p className="text-gray-600 mb-4">{cert.description}</p>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Anno: {cert.year}</span>
              <span>Categoria: {cert.category}</span>
            </div>
            <Button 
              className="w-full"
              onClick={() => window.open(cert.documentUrl, '_blank')}
            >
              Scarica Certificato
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Impegno per la Qualità</h2>
        <p className="text-gray-700">
          Le nostre certificazioni rappresentano il nostro impegno continuo verso l'eccellenza
          operativa e la soddisfazione del cliente. Ogni certificazione è il risultato di
          rigorosi processi di audit e valutazione da parte di enti certificatori accreditati.
        </p>
      </div>
    </main>
  );
}
