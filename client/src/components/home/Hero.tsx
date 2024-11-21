import { Button } from "@/components/ui/button";
import { STOCK_PHOTOS } from "@/lib/constants";

export function Hero() {
  return (
    <div className="relative h-screen min-h-[600px] flex items-center">
      <div className="absolute inset-0">
        <img
          src="/02249074-f62f-4668-8f61-700e9807b7d6.jpg"
          alt="Construction site"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Restauri: Mantieni viva la storia
          </h1>
          <p className="text-xl text-gray-200 mb-8">
            Oltre 20 anni di esperienza nel restauro e nella ristrutturazione
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Scopri i nostri servizi
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/20">
              Contattaci
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
