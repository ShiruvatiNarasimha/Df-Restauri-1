import { Building2, PaintBucket, Hammer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionSeparator } from "@/components/ui/section-separator";

const SERVICES = [
  {
    title: "Restauro",
    description: "Tecniche tradizionali e materiali di alta qualità per preservare il patrimonio storico.",
    icon: PaintBucket
  },
  {
    title: "Costruzione",
    description: "Progetti innovativi e sostenibili per costruire il futuro.",
    icon: Building2
  },
  {
    title: "Ristrutturazione",
    description: "Trasformiamo i tuoi spazi con soluzioni moderne ed efficienti.",
    icon: Hammer
  }
];

export function Services() {
  return (
    <section id="servizi" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <SectionSeparator className="mb-12" />
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">I Nostri Servizi</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Offriamo soluzioni complete per ogni esigenza nel campo dell'edilizia,
            dal restauro costruzione, sempre  un occhio sostenibilità.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service) => (
            <Card key={service.title} className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <service.icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>{service.title}</CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <div className="p-6">
                <Button className="w-full">
                  Richi
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
