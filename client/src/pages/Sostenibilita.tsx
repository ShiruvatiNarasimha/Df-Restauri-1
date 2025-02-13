import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf, Award } from "lucide-react";
import { Gallery } from "@/components/sostenibilita/Gallery";

const INITIATIVES = [
  {
    title: "Edilizia Sostenibile",
    description: "Utilizzo di materiali eco-compatibili e tecniche costruttive a basso impatto ambientale.",
    icon: Leaf,
  },
  {
    title: "Efficienza Energetica",
    description: "Implementazione di soluzioni per il risparmio energetico e l'utilizzo di energie rinnovabili.",
    icon: Leaf,
  },
  {
    title: "Gestione Rifiuti",
    description: "Sistema integrato di gestione e riciclo dei rifiuti da costruzione.",
    icon: Leaf,
  },
];

const CERTIFICATIONS = [
  {
    title: "ISO 14001",
    description: "Certificazione del sistema di gestione ambientale.",
    icon: Award,
  },
  {
    title: "LEED",
    description: "Leadership in Energy and Environmental Design.",
    icon: Award,
  },
  {
    title: "EMAS",
    description: "Eco-Management and Audit Scheme dell'Unione Europea.",
    icon: Award,
  },
];

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function Sostenibilita() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
      {/* Hero Section */}
      <section className="relative section-padding bg-primary/10">
        <div className="container section-spacing">
          <h1 className="text-4xl font-bold mb-4">Sostenibilità</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Il nostro impegno per un futuro sostenibile attraverso pratiche edilizie innovative e rispettose dell'ambiente.
          </p>
        </div>
      </section>

      {/* Environmental Initiatives */}
      <section className="section-padding">
        <div className="container section-spacing">
          <h2 className="text-3xl font-bold mb-8 text-center">Iniziative Ambientali</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {INITIATIVES.map((initiative) => (
              <Card key={initiative.title}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <initiative.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{initiative.title}</CardTitle>
                  <CardDescription>{initiative.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="section-padding bg-muted/50">
        <div className="container section-spacing">
          <h2 className="text-3xl font-bold mb-8 text-center">Certificazioni</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CERTIFICATIONS.map((cert) => (
              <Card key={cert.title}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <cert.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{cert.title}</CardTitle>
                  <CardDescription>{cert.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <Gallery />
      </main>
      <Footer />
    </div>
  );
}
