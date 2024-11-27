import { CheckCircle } from "lucide-react";
import { STOCK_PHOTOS } from "@/lib/constants";
import { SectionSeparator } from "@/components/ui/section-separator";

const VALUES = [
  "Qualità senza compromessi",
  "Innovazione sostenibile",
  "Rispetto per la tradizione",
  "Attenzione al cliente"
];

export function About() {
  return (
    <section id="chi-siamo" className="section-padding">
      <div className="container section-spacing">
        <SectionSeparator className="mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Chi Siamo</h2>
            <p className="text-gray-600 mb-6">
              Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, delle pitture e delle decorazioni. 
              Rappresenta la prosecuzione dell'attività nata nel 1992 in capo a De Faveri Luca. L'azienda ha saputo coniugare la 
              maestria artigianale con le più moderne tecniche, offrendo soluzioni personalizzate per ogni esigenza dalle delicate 
              operazioni di costruzione, ristrutturazione e restauro.
            </p>
          

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {VALUES.map((value) => (
                <div key={value} className="flex items-center gap-2">
                  <CheckCircle className="text-primary" />
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <img
              src={STOCK_PHOTOS.about}
              alt="Chi Siamo - DF Restauri"
              className="rounded-lg shadow-xl w-full h-full object-cover"
              loading="eager"
              decoding="async"
              width={800}
              height={600}
            />
            <div className="absolute -bottom-6 -left-6 bg-primary text-white p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">20+</div>
              <div className="text-sm">Anni di esperienza</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
