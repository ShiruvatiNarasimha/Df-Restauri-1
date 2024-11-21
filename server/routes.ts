import type { Express } from "express";

const DYNAMIC_CONTENT = {
  about: {
    storia: {
      title: "La Nostra Storia",
      content: "Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, delle pitture e delle decorazioni. Rappresenta la prosecuzione dell'attività nata nel 1992 in capo a De Faveri Luca. L'azienda ha saputo coniugare la maestria artigianale con le più moderne tecniche, offrendo soluzioni personalizzate per ogni esigenza dalle delicate operazioni di costruzione, ristrutturazione e restauro. DF è il partner ideale per chi desidera valorizzare i propri spazi con un tocco di esclusività. Grazie all'esperienza maturata nel corso degli anni, siamo in grado di garantire risultati impeccabili e duraturi, rispondendo alle richieste più esigenti del mercato dell'edilizia. Abbiamo saputo evolversi e adattarsi ai continui cambiamenti del mercato, mantenendo sempre al centro il cliente e la qualità dei lavori."
    },
    valori: {
      title: "Valori Aziendali",
      content: "Definizione dei principi e dei valori che guidano l'operato dell'azienda",
      items: [
        "Qualità senza compromessi",
        "Innovazione sostenibile",
        "Rispetto per la tradizione",
        "Attenzione al cliente"
      ]
    },
    mission: {
      title: "Mission",
      content: "Costruiamo il futuro, rispettando l'ambiente. Il nostro approccio all'edilizia è orientato alla sostenibilità e all'innovazione. Utilizziamo materiali eco-compatibili e tecnologie all'avanguardia per realizzare edifici efficienti dal punto di vista energetico e a basso impatto ambientale. Grazie ad una progettazione attenta e a una gestione efficiente delle risorse, siamo in grado di offrire soluzioni personalizzate e durature nel tempo."
    },
    vision: {
      title: "Vision",
      content: "Aspirare a diventare leader nel settore delle costruzioni sostenibili, creando un futuro dove l'eccellenza costruttiva si fonde con il rispetto per l'ambiente. Vogliamo essere riconosciuti come pionieri nell'innovazione edilizia sostenibile, mantenendo sempre vivo il legame con la tradizione e l'artigianato di qualità."
    }
  },
  case_studies: [
    {
      id: 1,
      title: "Restauro Palazzo Storico",
      description: "Recupero e valorizzazione di un edificio del XVIII secolo",
      image: "/images/case-studies/palazzo.jpg"
    },
    {
      id: 2,
      title: "Edificio Sostenibile",
      description: "Progetto di costruzione eco-compatibile",
      image: "/images/case-studies/eco.jpg"
    }
  ]
};

export function registerRoutes(app: Express) {
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    console.log("Contact form submission:", { name, email, phone, message });
    res.json({ success: true });
  });

  app.get("/api/content/:section", (req, res) => {
    const { section } = req.params;
    const content = DYNAMIC_CONTENT[section as keyof typeof DYNAMIC_CONTENT];
    
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }
    
    res.json(content);
  });

  app.get("/api/case-studies", (_req, res) => {
    res.json(DYNAMIC_CONTENT.case_studies);
  });
}
