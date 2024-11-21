import { Card } from "@/components/ui/card";
import { STOCK_PHOTOS } from "@/lib/constants";

interface GalleryItem {
  image: string;
  title: string;
  description: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    image: STOCK_PHOTOS.restoration[0],
    title: "Restauro Palazzo Storico",
    description: "Intervento di restauro sostenibile con materiali eco-compatibili"
  },
  {
    image: STOCK_PHOTOS.construction[0],
    title: "Edificio Zero Emissioni",
    description: "Costruzione moderna con tecnologie per l'efficienza energetica"
  },
  {
    image: STOCK_PHOTOS.renovation[0],
    title: "Ristrutturazione Green",
    description: "Ristrutturazione con focus sul risparmio energetico"
  },
  {
    image: STOCK_PHOTOS.restoration[1],
    title: "Recupero Centro Storico",
    description: "Restauro conservativo con materiali tradizionali sostenibili"
  },
  {
    image: STOCK_PHOTOS.construction[1],
    title: "Progetto Sostenibile",
    description: "Nuovo complesso residenziale a basso impatto ambientale"
  },
  {
    image: STOCK_PHOTOS.renovation[1],
    title: "Riqualificazione Energetica",
    description: "Intervento di efficientamento energetico completo"
  }
];

export function Gallery() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">
          I Nostri Progetti Sostenibili
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {GALLERY_ITEMS.map((item, index) => (
            <Card 
              key={index}
              className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
