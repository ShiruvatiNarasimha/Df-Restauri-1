import { Button } from "@/components/ui/button";
import * as React from "react";
import { Link } from "wouter";
import { STOCK_PHOTOS } from "@/lib/constants";

export function Hero() {
  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-[600px] max-h-[900px] flex items-center overflow-hidden">
      <div 
        className="absolute inset-0 transition-all duration-700 hover:scale-105 group"
      >
        <img
          src="/images/hero/hero-background.jpg"
          alt="Vista moderna di un cantiere di costruzione"
          width={1920}
          height={1080}
          className="w-full h-full object-cover object-center transition-all duration-700"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40 backdrop-blur-[2px] transition-opacity duration-700 group-hover:opacity-90" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-xl">
            Restauri: Mantieni viva la storia
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 mb-10 max-w-2xl leading-relaxed drop-shadow-lg">
            Oltre 20 anni di esperienza nel restauro e nella ristrutturazione
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/servizi">
              <a>
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md"
                >
                  Scopri i nostri servizi
                </Button>
              </a>
            </Link>
            <Button 
              size="lg" 
              className="bg-orange-500/80 hover:bg-orange-600/90 text-white text-lg px-8 py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md"
              onClick={() => {
                document.querySelector('#contattaci')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Contattaci
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-down">
        <div className="w-8 h-12 border-2 border-white/60 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-white/60 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
