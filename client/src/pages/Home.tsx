import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { Services } from "@/components/home/Services";
import { About } from "@/components/home/About";
import { VisionMission } from "@/components/home/VisionMission";
import { Contact } from "@/components/home/Contact";

export function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <Hero />
        <Services />
        <About />
        <VisionMission />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
