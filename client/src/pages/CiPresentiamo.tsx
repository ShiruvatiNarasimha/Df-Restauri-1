import { CheckCircle } from "lucide-react";
import { STOCK_PHOTOS } from "@/lib/constants";

const VALUES = [
  "Qualità senza compromessi",
  "Innovazione sostenibile",
  "Rispetto per la tradizione",
  "Attenzione al cliente"
];

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function CiPresentiamo() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Ci Presentiamo</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Scopri la nostra storia, i nostri valori e la passione che mettiamo in ogni progetto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">La Nostra Storia</h2>
              <p className="text-gray-600 mb-6">
                Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro,
                delle pitture e delle decorazioni. Rappresenta la prosecuzione dell'attività
                nata nel 1992 in capo a De Faveri Luca.
              </p>
              <p className="text-gray-600 mb-8">
                L'azienda ha saputo coniugare la maestria artigianale con le più moderne tecniche,
                offrendo soluzioni personalizzate per ogni esigenza nel settore delle costruzioni
                e del restauro architettonico.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                src={STOCK_PHOTOS.restoration[0]}
                alt="Il nostro lavoro di restauro"
                className="rounded-lg shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-primary text-white p-6 rounded-lg">
                <div className="text-4xl font-bold mb-2">20+</div>
                <div className="text-sm">Anni di esperienza</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
      <Footer />
    </div>
  );
}
