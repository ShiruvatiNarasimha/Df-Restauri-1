import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img 
              src="/logorestauri.png"
              alt="DF Restauri"
              className="h-12 mb-4 brightness-0 invert"
            />
            <p className="text-gray-400 mt-4">
              Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, 
              delle pitture e delle decorazioni.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Collegamenti Rapidi</h3>
            <nav className="flex flex-col gap-2">
              {NAVIGATION_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contatti</h3>
            <div className="flex flex-col gap-4">
              <a href="tel:+390009630" className="flex items-center gap-2 text-gray-400 hover:text-white">
                <Phone size={20} />
                +39 000 9630
              </a>
              <a href="mailto:info@dfrestauri.it" className="flex items-center gap-2 text-gray-400 hover:text-white">
                <Mail size={20} />
                info@dfrestauri.it
              </a>
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin size={20} />
                Via Roma 123, Milano
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Seguici</h3>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={24} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>© {new Date().getFullYear()} DF Restauri SRL. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}
